import { http } from "../core/http";

interface BaseUser {
  id: string;
  name: string;
  email: string;
  status: "active";
}

export interface AdminUser extends BaseUser { role: "admin" }
export interface CustomerUser extends BaseUser { role: "customer"; phone: string }

interface AuthResponse<TUser extends BaseUser> {
  success: true;
  data: { user: TUser };
}

export async function getCurrentUser(): Promise<AdminUser> {
  const response = await http.get<AuthResponse<AdminUser>>("/auth/me");
  return response.data.data.user;
}

export async function getCurrentCustomer(): Promise<CustomerUser> {
  const response = await http.get<AuthResponse<CustomerUser>>("/auth/customer/me");
  return response.data.data.user;
}

export async function loginAdmin(credentials: { email: string; password: string }): Promise<AdminUser> {
  const response = await http.post<AuthResponse<AdminUser>>("/auth/login", credentials);
  return response.data.data.user;
}

export async function loginCustomer(credentials: { identifier: string; password: string }): Promise<CustomerUser> {
  const response = await http.post<AuthResponse<CustomerUser>>("/auth/customer/login", credentials);
  return response.data.data.user;
}

export async function registerCustomer(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<CustomerUser> {
  const response = await http.post<AuthResponse<CustomerUser>>("/auth/customer/register", input);
  return response.data.data.user;
}

export async function logoutAdmin(): Promise<void> {
  await http.post("/auth/logout");
}

export async function logoutUser(): Promise<void> {
  await http.post("/auth/customer/logout");
}
