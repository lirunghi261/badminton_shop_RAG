import { http } from "../core/http";

export interface CartCheckItem {
  productId: string;
  sku: string;
  quantity: number;
  expectedUnitPrice?: number;
}

export interface CartCheckResultItem {
  productId: string;
  sku: string;
  quantity: number;
  unitPrice: number | null;
  stock: number | null;
  lineTotal: number | null;
  priceChanged: boolean;
  issues: Array<"OUT_OF_STOCK" | "PRODUCT_UNAVAILABLE" | "SKU_UNAVAILABLE" | "PRICE_CHANGED">;
}

export async function checkCart(items: CartCheckItem[]): Promise<CartCheckResultItem[]> {
  const response = await http.post<{ success: true; data: { items: CartCheckResultItem[] } }>("/checkout/check", { items });
  return response.data.data.items;
}
