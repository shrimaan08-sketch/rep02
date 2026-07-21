import axios, { AxiosError, AxiosInstance } from "axios";
import Cookies from "js-cookie";

// Default to the frontend's OWN origin (/api/v1), which is proxied to the real
// backend by the Next.js route handler at app/api/v1/[...path]. This means the
// browser never makes a cross-origin call — no CORS, and no backend URL baked
// into the client bundle. Set NEXT_PUBLIC_API_URL only if you want the browser
// to call the backend directly instead of going through the proxy.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const ACCESS_TOKEN_COOKIE = "eco_access_token";
export const REFRESH_TOKEN_COOKIE = "eco_refresh_token";

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

if (DEMO_MODE) {
  // Route every request through the in-browser mock engine instead of a
  // real network call. This is what lets the hosted preview "work" without
  // Postgres/Redis/FastAPI running anywhere — see lib/demo/engine.ts.
  api.defaults.adapter = async (config) => {
    const { handleDemoRequest, DemoApiError } = await import("./demo/engine");
    const url = new URL(config.url || "", "http://demo.local");
    const query = url.searchParams;
    const body = typeof config.data === "string" ? JSON.parse(config.data || "{}") : config.data || {};

    // Simulated latency so it doesn't feel instantaneous/fake.
    await new Promise((r) => setTimeout(r, 250 + Math.random() * 200));

    try {
      const data = await handleDemoRequest(config.method || "get", url.pathname, query, body);
      return { data, status: 200, statusText: "OK", headers: {}, config };
    } catch (err) {
      if (err instanceof DemoApiError) {
        return Promise.reject({
          isAxiosError: true,
          message: err.message,
          config,
          response: { status: err.status, statusText: "", headers: {}, config, data: { detail: err.message } },
        });
      }
      throw err;
    }
  };
}

api.interceptors.request.use((config) => {
  const token = Cookies.get(ACCESS_TOKEN_COOKIE);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== "/auth/login") {
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push(() => resolve(api(originalRequest)));
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE);

      if (!refreshToken || DEMO_MODE) {
        clearSession();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
        Cookies.set(ACCESS_TOKEN_COOKIE, data.access_token, { expires: 1 });
        Cookies.set(REFRESH_TOKEN_COOKIE, data.refresh_token, { expires: 7 });
        pendingQueue.forEach((cb) => cb());
        pendingQueue = [];
        return api(originalRequest);
      } catch (refreshError) {
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function clearSession() {
  Cookies.remove(ACCESS_TOKEN_COOKIE);
  Cookies.remove(REFRESH_TOKEN_COOKIE);
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as any)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
    return error.message;
  }
  return "An unexpected error occurred.";
}

export default api;
