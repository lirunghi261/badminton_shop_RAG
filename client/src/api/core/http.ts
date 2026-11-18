import axios, { type InternalAxiosRequestConfig } from "axios";

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

const refreshRequests = new Map<string, Promise<unknown>>();

function refreshSession(path: string) {
  const pending = refreshRequests.get(path);
  if (pending) return pending;
  const refresh = http.post(path).finally(() => refreshRequests.delete(path));
  refreshRequests.set(path, refresh);
  return refresh;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as RetryRequestConfig | undefined;
    const isAuthenticationRequest = [
      "/auth/login",
      "/auth/customer/login",
      "/auth/customer/register",
      "/auth/customer/refresh",
      "/auth/refresh",
    ].some((path) => request?.url?.includes(path));

    if (error.response?.status === 401 && request && !request._retry && !isAuthenticationRequest) {
      request._retry = true;
      const isCustomerRequest = request.url?.includes("/auth/customer/me") || request.url?.startsWith("/customer/");
      await refreshSession(isCustomerRequest ? "/auth/customer/refresh" : "/auth/refresh");
      return http(request);
    }

    return Promise.reject(error);
  },
);

