let errorToastHandler = null;
let successToastHandler = null;

export function registerErrorToastHandler(handler) {
  errorToastHandler = typeof handler === "function" ? handler : null;
}

export function registerSuccessToastHandler(handler) {
  successToastHandler = typeof handler === "function" ? handler : null;
}

export function showApiErrorToast(message) {
  const text = message != null ? String(message).trim() : "";
  if (text && errorToastHandler) {
    errorToastHandler(text);
  }
}

export function showApiSuccessToast(message) {
  const text = message != null ? String(message).trim() : "";
  if (text && successToastHandler) {
    successToastHandler(text);
  }
}
