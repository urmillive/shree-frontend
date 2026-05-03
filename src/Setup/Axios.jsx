import axios from "axios";

const LEGACY_ACCESS_TOKEN_KEY = "accessToken";
const CUSTOMER_ACCESS_TOKEN_KEY = "access_token";
const ADMIN_ACCESS_TOKEN_KEY = "admin_token";
const ROLE_KEY = "role";
const USER_DISPLAY_NAME_KEY = "user_display_name";
const AUTH_LOGIN_PATH = "/login";

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

export const setStoredAccessToken = (token) => {
  if (token) {
    localStorage.setItem(CUSTOMER_ACCESS_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, token);
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
  (response) => response,
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
      return Promise.reject(refreshError);
    }
  }
);

export default client;