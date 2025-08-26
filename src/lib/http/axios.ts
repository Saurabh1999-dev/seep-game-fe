import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://localhost:7070/";

export const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

http.interceptors.request.use((config) => {
  return config;
});

// Response interceptor with proper error handling
http.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only log errors in development
    if (process.env.NODE_ENV === "development") {
      console.error("[HTTP ERROR]", err?.response?.status, err?.response?.data ?? err.message);
    }
    return Promise.reject(err);
  }
);

