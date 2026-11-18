import type { CustomerUser } from "../api/auth/auth.api";

const storageKey = "badminton-shop-customer";

/** Stores display-only customer data. Authentication remains in the httpOnly cookie. */
export function saveCustomerSession(user: CustomerUser) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ id: user.id, name: user.name }));
  } catch {
    // A browser storage failure must not interrupt cookie authentication.
  }
}

export function clearCustomerSession() {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // The server session still controls authentication.
  }
}
