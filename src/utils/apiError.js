/**
 * Parse API error payloads, including:
 * { success: false, error: { code, message } }
 * { success: false, error: { code: "VALIDATION_ERROR", message: "...", errors: [{ field, message }] } }
 * Same shapes with `status: false` instead of `success: false`.
 */

const GENERIC_SUMMARY_MESSAGES = /^(validation failed|bad request|request failed)$/i;

/**
 * Extract a single human-readable line from one validation/detail entry.
 * @param {unknown} entry
 * @returns {string | null}
 */
function validationEntryToLine(entry) {
  if (entry == null) {
    return null;
  }

  if (typeof entry === "string") {
    const t = entry.trim();
    return t ? t : null;
  }

  if (typeof entry !== "object") {
    return null;
  }

  const msg =
    entry.message ??
    entry.msg ??
    entry.detail ??
    entry.description ??
    (typeof entry.error === "string" ? entry.error : null);

  const rawField = entry.field ?? entry.path ?? entry.param ?? entry.key ?? entry.location;
  const field =
    rawField != null && String(rawField).trim()
      ? String(rawField).replace(/^\*\./, "").replace(/^body\./i, "").replace(/^query\./i, "")
      : "";

  const msgStr = msg != null ? String(msg).trim() : "";

  if (field && msgStr) {
    return `${field}: ${msgStr}`;
  }

  return msgStr || field || null;
}

/**
 * @param {unknown} errors
 * @returns {string | null}
 */
export function formatValidationErrorsList(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return null;
  }

  const lines = errors.map(validationEntryToLine).filter(Boolean);
  if (lines.length === 0) {
    return null;
  }

  return lines.join(" • ");
}

/**
 * @param {Record<string, unknown> | null | undefined} errorObj
 * @returns {string | null}
 */
function messageFromErrorObject(errorObj) {
  if (!errorObj || typeof errorObj !== "object") {
    return null;
  }

  /** @type {Record<string, unknown>} */
  const o = errorObj;

  const details = formatValidationErrorsList(o.errors ?? o.details ?? o.fieldErrors ?? o.validationErrors);
  const summary = o.message ? String(o.message).trim() : "";

  if (details) {
    if (!summary || GENERIC_SUMMARY_MESSAGES.test(summary)) {
      return details;
    }
    const lowerSummary = summary.toLowerCase();
    const detailsLower = details.toLowerCase();
    if (detailsLower.includes(lowerSummary) || lowerSummary.includes("validation")) {
      return details;
    }
    return `${summary}: ${details}`;
  }

  if (summary) {
    return summary;
  }

  if (o.code) {
    return String(o.code).replace(/_/g, " ");
  }

  return null;
}

/**
 * @param {unknown} data
 * @returns {boolean}
 */
export function isApiFailureEnvelope(data) {
  if (data == null || typeof data !== "object") {
    return false;
  }
  return (
    /** @type {{ success?: boolean; status?: boolean }} */ (data).success === false ||
    /** @type {{ success?: boolean; status?: boolean }} */ (data).status === false
  );
}

/**
 * Prefer server `message` / `msg` when `success: true` or `status: true`.
 * @param {unknown} data
 * @returns {string | null} Message to show, or null if not a success envelope.
 */
export function getApiSuccessMessage(data) {
  if (data == null || typeof data !== "object") {
    return null;
  }

  /** @type {{ success?: boolean; status?: boolean; message?: unknown; msg?: unknown; description?: unknown; meta?: { message?: unknown } }} */
  const o = data;

  const ok = o.success === true || o.status === true;
  if (!ok) {
    return null;
  }

  const raw =
    o.message ?? o.msg ?? o.description ??
    (typeof o.meta?.message === "string" ? o.meta.message : null);

  const t = raw != null ? String(raw).trim() : "";
  return t || "Success";
}

export function getApiErrorFromPayload(data) {
  if (data == null || typeof data !== "object") {
    return null;
  }

  if (isApiFailureEnvelope(data)) {
    const nested = data.error;

    if (typeof nested === "string" && nested.trim()) {
      return nested.trim();
    }

    if (nested && typeof nested === "object") {
      const fromNested = messageFromErrorObject(nested);
      if (fromNested) {
        return fromNested;
      }
    }
  }

  const errField = data.error;

  if (typeof errField === "string" && errField.trim()) {
    return errField.trim();
  }

  if (errField && typeof errField === "object") {
    const fromErr = messageFromErrorObject(errField);
    if (fromErr) {
      return fromErr;
    }
  }

  if (data.message) {
    return String(data.message);
  }

  return null;
}

export function getApiErrorCode(error) {
  const data = error?.response?.data ?? error?.data;
  if (!data || typeof data !== "object") {
    return null;
  }
  const code = data?.error?.code ?? data?.code;
  return code != null ? String(code) : null;
}

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) {
    return fallback;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  const data = error.response?.data ?? error.data;
  const fromPayload = getApiErrorFromPayload(data);
  if (fromPayload) {
    return fromPayload;
  }

  if (error.message === "Network Error") {
    return "Network error. Please check your connection and try again.";
  }

  if (error.message && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
}

export function getApiValidationErrors(error) {
  const data = error?.response?.data ?? error?.data;
  if (!data || typeof data !== "object") {
    return [];
  }
  const err = data.error;
  if (!err || typeof err !== "object") {
    return [];
  }
  const list = err.errors ?? err.details;
  return Array.isArray(list) ? list : [];
}

export function createApiErrorFromResponse(response, fallback = "Request failed.") {
  const message = getApiErrorFromPayload(response?.data) || fallback;
  const error = new Error(message);
  error.response = response;
  error.isApiError = true;
  return error;
}
