import { createContext } from "react";
import type { StorefrontProduct, StorefrontProductVariant } from "../api/storefront/products.api";

export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  variantSku: string;
  variantName: string;
  colorHex: string;
  price: number;
  quantity: number;
  stock: number;
  /** Set after the cart is reconciled with the server catalogue. */
  availabilityIssue?: "OUT_OF_STOCK" | "PRODUCT_UNAVAILABLE" | "SKU_UNAVAILABLE";
  priceChanged?: boolean;
}

export interface CartAddResult {
  addedQuantity: number;
  totalQuantity: number;
}

export interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isSyncing: boolean;
  hasUnavailableItems: boolean;
  addProduct: (product: StorefrontProduct, variant?: StorefrontProductVariant, quantity?: number) => CartAddResult | null;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | null>(null);
