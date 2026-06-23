import axios from "axios";
import {
  createApiErrorFromResponse,
  getApiErrorMessage,
  getApiSuccessMessage,
  isApiFailureEnvelope,
} from "../utils/apiError";
import { showApiErrorToast, showApiSuccessToast } from "../utils/errorToastBridge";

const LEGACY_ACCESS_TOKEN_KEY = "accessToken";
const CUSTOMER_ACCESS_TOKEN_KEY = "access_token";
const ADMIN_ACCESS_TOKEN_KEY = "admin_token";
const ROLE_KEY = "role";
const USER_DISPLAY_NAME_KEY = "user_display_name";
const AUTH_LOGIN_PATH = "/login";
export const AUTH_SESSION_CHANGED_EVENT = "shree:auth-session-changed";

const notifyAuthSessionChanged = () => {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
};

const extractAccessToken = (payload) =>{
  return payload?.data?.accessToken || payload?.accessToken || null;
}

export const getStoredRole = () => localStorage.getItem(ROLE_KEY);

export const setStoredRole = (role) => {
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
  }
};

export const clearStoredRole = () => {
  localStorage.removeItem(ROLE_KEY);
};

export const getStoredUserDisplayName = () => localStorage.getItem(USER_DISPLAY_NAME_KEY);

export const setStoredUserDisplayName = (name) => {
  const trimmed = name != null ? String(name).trim() : "";
  if (trimmed) {
    localStorage.setItem(USER_DISPLAY_NAME_KEY, trimmed);
  }
};

export const clearStoredUserDisplayName = () => {
  localStorage.removeItem(USER_DISPLAY_NAME_KEY);
};

export const getStoredAccessToken = () =>
  localStorage.getItem(CUSTOMER_ACCESS_TOKEN_KEY) ||
  localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY) ||
  localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);

export const getStoredCustomerAccessToken = () =>
  localStorage.getItem(CUSTOMER_ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);

export const setStoredAccessToken = (token) => {
  if (token) {
    localStorage.setItem(CUSTOMER_ACCESS_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, token);
    notifyAuthSessionChanged();
  }
};

export const setStoredAdminToken = (token) => {
  if (token) {
    localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, token);
  }
};

export const clearStoredAccessToken = () => {
  localStorage.removeItem(CUSTOMER_ACCESS_TOKEN_KEY);
  localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  clearStoredRole();
  clearStoredUserDisplayName();
  notifyAuthSessionChanged();
};

const redirectToLogin = () => {
  if (window.location.pathname !== AUTH_LOGIN_PATH) {
    window.location.replace(AUTH_LOGIN_PATH);
  }
};

let refreshPromise = null;

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        "/api/auth/refresh",
        {},
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
      .then((response) => {
        const accessToken = extractAccessToken(response?.data);

        if (!accessToken) {
          throw new Error("Access token missing from refresh response.");
        }

        setStoredAccessToken(accessToken);
        return accessToken;
      })
      .catch((error) => {
        clearStoredAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

/** Auth calls: pages usually show inline status; keep global toasts off. */
const AUTH_API_PATH_FRAGMENTS_SILENT_TOASTS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/resend-email-otp",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/refresh",
  "/auth/logout",
];

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

const shouldSkipErrorToast = (config) => {
  if (!config) {
    return false;
  }
  if (config.skipErrorToast) {
    return true;
  }
  const url = String(config.url || "");
  return AUTH_API_PATH_FRAGMENTS_SILENT_TOASTS.some((path) => url.includes(path));
};

const shouldSkipSuccessToast = (config) => {
  if (!config) {
    return true;
  }
  if (config.skipSuccessToast) {
    return true;
  }
  const rt = String(config.responseType || "").toLowerCase();
  if (rt && rt !== "json") {
    return true;
  }
  const url = String(config.url || "");
  if (AUTH_API_PATH_FRAGMENTS_SILENT_TOASTS.some((path) => url.includes(path))) {
    return true;
  }
  const method = (config.method || "get").toLowerCase();
  if (!MUTATING_METHODS.has(method) && !config.showSuccessToast) {
    return true;
  }
  return false;
};

const notifyApiError = (error, config) => {
  if (shouldSkipErrorToast(config)) {
    return;
  }
  const status = error?.response?.status;
  if (status === 401) {
    return;
  }
  showApiErrorToast(getApiErrorMessage(error));
};

const notifyApiSuccess = (response) => {
  if (shouldSkipSuccessToast(response?.config)) {
    return;
  }
  const data = response?.data;
  if (data == null || typeof data !== "object") {
    return;
  }
  const message = getApiSuccessMessage(data);
  if (!message) {
    return;
  }
  showApiSuccessToast(message);
};

const client = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const accessToken = getStoredAccessToken();

  config.headers = config.headers || {};

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

client.interceptors.response.use(
  (response) => {
    const data = response?.data;
    if (data && typeof data === "object" && isApiFailureEnvelope(data)) {
      const apiError = createApiErrorFromResponse(response);
      notifyApiError(apiError, response.config);
      return Promise.reject(apiError);
    }
    notifyApiSuccess(response);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";
    const isRefreshRequest = requestUrl.includes("/auth/refresh");
    const isPublicAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/verify-email") ||
      requestUrl.includes("/auth/resend-email-otp") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/reset-password") ||
      requestUrl.includes("/auth/logout");

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isRefreshRequest ||
      isPublicAuthRequest
    ) {
      if (isRefreshRequest && status === 401) {
        clearStoredAccessToken();
        redirectToLogin();
      }

      notifyApiError(error, originalRequest);
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessToken();

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return client(originalRequest);
    } catch (refreshError) {
      clearStoredAccessToken();
      redirectToLogin();
      notifyApiError(refreshError, originalRequest);
      return Promise.reject(refreshError);
    }
  }
);

export default client;