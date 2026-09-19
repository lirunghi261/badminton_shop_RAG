import { http } from "../core/http";

export interface DashboardSummary {
  products: number;
  orders: number;
  customers: number;
  lowStock: number;
  revenue: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await http.get<{ success: true; data: DashboardSummary }>(
    "/admin/dashboard/summary",
  );
  return response.data.data;
}
