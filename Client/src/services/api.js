import axios from "axios";
import {
  clearAuthAndRedirectToLogin,
  getAuthSnapshot,
  setAuthExternal,
} from "../context/AuthContext";

// const API_BASE_URL = "http://localhost:5000/api";
const API_BASE_URL = "http://localhost:5000/api";


export const api = axios.create({
  baseURL: API_BASE_URL,
  // Use bearer token for regular API calls; no cookie needed here.
  withCredentials: false,
});

// Separate client for refresh to avoid interceptor loops.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const { accessToken } = getAuthSnapshot();
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    // If we've already retried once, treat as unauthenticated.
    if (originalRequest.__isRetryAfterRefresh) {
      clearAuthAndRedirectToLogin();
      return Promise.reject(error);
    }

    originalRequest.__isRetryAfterRefresh = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post("/auth/refresh")
          .then((res) => res?.data?.data)
          .finally(() => {
            refreshPromise = null;
          });
      }

      const refreshed = await refreshPromise;
      if (!refreshed?.accessToken) {
        clearAuthAndRedirectToLogin();
        return Promise.reject(error);
      }

      setAuthExternal(refreshed);

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
      return api(originalRequest);
    } catch (e) {
      clearAuthAndRedirectToLogin();
      return Promise.reject(e);
    }
  },
);

const unwrapAuth = (res) => {
  const data = res?.data?.data;
  return { user: data?.user ?? null, accessToken: data?.accessToken ?? null };
};

export const authApi = {
  async login(body) {
    const res = await refreshClient.post("/auth/login", body);
    return unwrapAuth(res);
  },
  async register(body) {
    const res = await refreshClient.post("/auth/register", body);
    return unwrapAuth(res);
  },
  async refresh() {
    const res = await refreshClient.post("/auth/refresh");
    return unwrapAuth(res);
  },
  async logout() {
    await refreshClient.post("/auth/logout");
  },
};
