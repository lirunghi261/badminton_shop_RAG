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
    const isAuthenticationRequest = [
      "/auth/login",
      "/auth/customer/login",
      "/auth/customer/register",
      "/auth/refresh",
    ].some((path) => request?.url?.includes(path));

    if (error.response?.status === 401 && request && !request._retry && !isAuthenticationRequest) {
      request._retry = true;
      const isCustomerRequest = request.url?.includes("/auth/customer/me") || request.url?.startsWith("/customer/");
      await http.post(isCustomerRequest ? "/auth/customer/refresh" : "/auth/refresh");
      return http(request);
    }

    return Promise.reject(error);
  },
);

