import type { CustomerUser } from "../api/auth/auth.api";

const storageKey = "badminton-shop-customer";

/** Stores display-only customer data. Authentication remains in the httpOnly cookie. */
export function saveCustomerSession(user: CustomerUser) {
  window.localStorage.setItem(storageKey, JSON.stringify({ id: user.id, name: user.name, email: user.email, phone: user.phone }));
}

export function clearCustomerSession() {
  window.localStorage.removeItem(storageKey);
}
