import type { CreateCustomerOrderInput } from "../api/storefront/orders.api";

export interface PendingCheckout {
  key: string;
  input: CreateCustomerOrderInput;
}

const storageKey = (customerId: string) => `badminton-shop-pending-checkout:${customerId}`;

export function readPendingCheckout(customerId: string): PendingCheckout | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(customerId)) ?? "null") as PendingCheckout | null;
    const input = value?.input;
    if (
      !value || typeof value.key !== "string" || !/^[a-f\d-]{36}$/i.test(value.key) ||
      !input || input.paymentMethod !== "cod" ||
      typeof input.customer?.fullName !== "string" || typeof input.customer.phone !== "string" ||
      typeof input.customer.email !== "string" || typeof input.shippingAddress?.addressLine !== "string" ||
      typeof input.customerNote !== "string" || !Array.isArray(input.items) || !input.items.length ||
      !input.items.every((item) => item && /^[a-f\d]{24}$/i.test(item.productId) &&
        typeof item.sku === "string" && Number.isInteger(item.quantity) && item.quantity > 0)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export function savePendingCheckout(customerId: string, checkout: PendingCheckout | null) {
  try {
    if (checkout) sessionStorage.setItem(storageKey(customerId), JSON.stringify(checkout));
    else sessionStorage.removeItem(storageKey(customerId));
  } catch {
    // The mounted checkout still retains its request if browser storage is unavailable.
  }
}
