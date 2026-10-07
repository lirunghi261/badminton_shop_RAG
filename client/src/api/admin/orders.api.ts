import { http } from "../core/http";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipping"
  | "completed"
  | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "cod" | "bank_transfer";
export type OrderSort = "newest" | "oldest" | "total_desc" | "total_asc";

export interface OrderCustomer {
  fullName: string;
  phone: string;
  email: string;
}

export interface OrderShippingAddress {
  addressLine: string;
  ward: string;
  district: string;
  province: string;
}

export interface OrderItem {
  productId: string;
  variantId: string | null;
  sku: string;
  productName: string;
  variantName: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderHistoryEntry<TStatus> {
  from: TStatus | null;
  to: TStatus;
  note: string;
  changedBy: string | null;
  changedAt: string;
}

export interface ManagedOrder {
  id: string;
  orderCode: string;
  userId: string | null;
  customer: OrderCustomer;
  shippingAddress: OrderShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentPaidAt: string | null;
  customerNote: string;
  adminNote: string;
  cancellationReason: string;
  statusHistory: OrderHistoryEntry<OrderStatus>[];
  paymentHistory: OrderHistoryEntry<PaymentStatus>[];
  allowedNextStatuses: OrderStatus[];
  allowedNextPaymentStatuses: PaymentStatus[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderListParams {
  page: number;
  limit: number;
  search: string;
  status: "all" | OrderStatus;
  paymentStatus: "all" | PaymentStatus;
  paymentMethod: "all" | PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  sort: OrderSort;
}

export interface OrderListResult {
  orders: ManagedOrder[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function getOrders(params: OrderListParams): Promise<OrderListResult> {
  const response = await http.get<{ success: true; data: OrderListResult }>("/admin/orders", { params });
  return response.data.data;
}

export async function getOrder(id: string): Promise<ManagedOrder> {
  const response = await http.get<{ success: true; data: { order: ManagedOrder } }>(`/admin/orders/${id}`);
  return response.data.data.order;
}

export async function updateOrderStatus(
  id: string,
  input: { status: OrderStatus; note: string },
): Promise<ManagedOrder> {
  const response = await http.patch<{ success: true; data: { order: ManagedOrder } }>(
    `/admin/orders/${id}/status`,
    input,
  );
  return response.data.data.order;
}

export async function updatePaymentStatus(
  id: string,
  input: { paymentStatus: PaymentStatus; note: string },
): Promise<ManagedOrder> {
  const response = await http.patch<{ success: true; data: { order: ManagedOrder } }>(
    `/admin/orders/${id}/payment-status`,
    input,
  );
  return response.data.data.order;
}

export async function updateOrderAdminNote(id: string, adminNote: string): Promise<ManagedOrder> {
  const response = await http.patch<{ success: true; data: { order: ManagedOrder } }>(
    `/admin/orders/${id}/admin-note`,
    { adminNote },
  );
  return response.data.data.order;
}
