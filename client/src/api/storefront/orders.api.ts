import { http } from "../core/http";

export type CustomerOrderStatus = "pending" | "confirmed" | "processing" | "shipping" | "completed" | "cancelled";
export type CustomerPaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export interface CustomerOrder {
  id: string;
  orderCode: string;
  customer: { fullName: string; phone: string; email: string };
  shippingAddress: { addressLine: string };
  items: Array<{ productId: string; variantId: string | null; sku: string; productName: string; variantName: string; imageUrl: string; unitPrice: number; quantity: number; lineTotal: number }>;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  status: CustomerOrderStatus;
  paymentMethod: "cod";
  paymentStatus: CustomerPaymentStatus;
  customerNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerOrderInput {
  customer: { fullName: string; phone: string; email: string };
  shippingAddress: { addressLine: string };
  items: Array<{ productId: string; sku: string; quantity: number }>;
  paymentMethod: "cod";
  customerNote: string;
}

export async function createCustomerOrder(input: CreateCustomerOrderInput, idempotencyKey: string): Promise<CustomerOrder> {
  const response = await http.post<{ success: true; data: { order: CustomerOrder } }>("/customer/orders", input, { headers: { "Idempotency-Key": idempotencyKey } });
  return response.data.data.order;
}

export async function getCustomerOrders(params: { page: number; limit: number }) {
  const response = await http.get<{ success: true; data: { orders: CustomerOrder[]; pagination: { page: number; limit: number; total: number; totalPages: number } } }>("/customer/orders", { params });
  return response.data.data;
}

export async function getCustomerOrder(id: string): Promise<CustomerOrder> {
  const response = await http.get<{ success: true; data: { order: CustomerOrder } }>(`/customer/orders/${id}`);
  return response.data.data.order;
}
