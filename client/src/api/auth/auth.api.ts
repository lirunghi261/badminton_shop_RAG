import { http } from "../core/http";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin";
  status: "active";
}

interface AuthResponse {
  success: true;
  data: { user: AdminUser };
}

export async function getCurrentUser(): Promise<AdminUser> {
  const response = await http.get<AuthResponse>("/auth/me");
  return response.data.data.user;
}

export async function loginAdmin(credentials: { email: string; password: string }): Promise<AdminUser> {
  const response = await http.post<AuthResponse>("/auth/login", credentials);
  return response.data.data.user;
}

export async function logoutAdmin(): Promise<void> {
  await http.post("/auth/logout");
}
