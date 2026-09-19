import axios, { type InternalAxiosRequestConfig } from "axios";

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as RetryRequestConfig | undefined;
    const isAuthenticationRequest =
      request?.url?.includes("/auth/login") || request?.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && request && !request._retry && !isAuthenticationRequest) {
      request._retry = true;
      await http.post("/auth/refresh");
      return http(request);
    }

    return Promise.reject(error);
  },
);

