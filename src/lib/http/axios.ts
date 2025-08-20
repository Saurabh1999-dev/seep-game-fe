import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://localhost:7070/";

export const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// Optional: request/response logging (dev only)
http.interceptors.request.use((config) => {
  if (process.env.NODE_ENV !== "production") {
    const method = (config.method ?? "get").toUpperCase();
    const base = config.baseURL ?? "";
    const url = config.url ?? "";
    // eslint-disable-next-line no-console
    console.log("[HTTP] →", method, `${base}${url}`, config.data ?? "");
  }
  return config;
});

http.interceptors.response.use(
  (res) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[HTTP] ←", res.status, res.config.url, res.data);
    }
    return res;
  },
  (err) => {
    // eslint-disable-next-line no-console
    console.error("[HTTP ERROR]", err?.response?.status, err?.response?.data ?? err.message);
    return Promise.reject(err);
  }
);
