import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { checkCart } from "../api/storefront/checkout.api";
import type { StorefrontProduct, StorefrontProductVariant } from "../api/storefront/products.api";
import { getPrimaryImage, getVariantName, getVariantPricing } from "../components/storefront/productPresentation";
import { CartContext, type CartAddResult, type CartContextValue, type CartItem } from "./cartContext";

const storageKey = "badminton-shop-cart";
const storageVersion = 2;
const objectIdPattern = /^[a-f\d]{24}$/i;

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function toStoredItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<CartItem>;
  if (typeof item.productId !== "string" || !objectIdPattern.test(item.productId) || typeof item.variantSku !== "string" || !item.variantSku || !isPositiveInteger(item.quantity) || typeof item.price !== "number" || !Number.isFinite(item.price) || item.price < 0) return null;
  const quantity = item.quantity;
  const price = item.price;
  const stock = typeof item.stock === "number" && Number.isFinite(item.stock) ? Math.max(0, Math.floor(item.stock)) : 0;
  return {
    key: `${item.productId}:${item.variantSku}`,
    productId: item.productId, slug: typeof item.slug === "string" ? item.slug : "",
    name: typeof item.name === "string" ? item.name : "Sản phẩm không còn khả dụng",
    imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
    imageAlt: typeof item.imageAlt === "string" ? item.imageAlt : "",
    variantSku: item.variantSku, variantName: typeof item.variantName === "string" ? item.variantName : item.variantSku,
    colorHex: typeof item.colorHex === "string" ? item.colorHex : "", price,
    quantity, stock, availabilityIssue: stock > 0 ? undefined : "OUT_OF_STOCK",
  };
}

function getStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    const rawItems = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items) ? (parsed as { items: unknown[] }).items : [];
    const byKey = new Map<string, CartItem>();
    for (const rawItem of rawItems) {
      const item = toStoredItem(rawItem);
      if (!item) continue;
      const existing = byKey.get(item.key);
      byKey.set(item.key, existing ? { ...existing, quantity: existing.quantity + item.quantity } : item);
    }
    return [...byKey.values()];
  } catch { return []; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(getStoredCart);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify({ version: storageVersion, items })); }, [items]);

  const refreshCart = useCallback(async () => {
    const snapshot = getStoredCart();
    if (!snapshot.length) return;
    setIsSyncing(true);
    try {
      const checked = await checkCart(snapshot.map((item) => ({ productId: item.productId, sku: item.variantSku, quantity: item.quantity, expectedUnitPrice: item.price })));
      const byKey = new Map(checked.map((item) => [`${item.productId}:${item.sku}`, item]));
      setItems((current) => current.map((item) => {
        const fresh = byKey.get(item.key);
        if (!fresh) return item;
        const unavailable = fresh.issues.find((issue) => issue === "PRODUCT_UNAVAILABLE" || issue === "SKU_UNAVAILABLE");
        const stock = Math.max(0, Math.floor(fresh.stock ?? 0));
        const availabilityIssue = unavailable ?? (stock < 1 ? "OUT_OF_STOCK" : undefined);
        return { ...item, stock, quantity: stock > 0 ? Math.min(item.quantity, stock) : item.quantity, price: fresh.unitPrice ?? item.price, priceChanged: fresh.priceChanged, availabilityIssue };
      }));
    } catch {
      // The stored cart remains usable while offline; checkout will validate again server-side.
    } finally { setIsSyncing(false); }
  }, []);

  useEffect(() => { void refreshCart(); }, [refreshCart]);
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => { if (event.key === storageKey) setItems(getStoredCart()); };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const addProduct = (product: StorefrontProduct, variant?: StorefrontProductVariant, quantity = 1): CartAddResult | null => {
      const selectedVariant = variant ?? product.variants.find((candidate) => candidate.stock > 0) ?? product.variants[0];
      const stock = selectedVariant ? Math.max(0, Math.floor(selectedVariant.stock)) : 0;
      if (!selectedVariant || stock < 1) return null;
      const requestedQuantity = Number.isFinite(quantity) ? Math.min(Math.max(1, Math.floor(quantity)), stock) : 1;
      const key = `${product.id}:${selectedVariant.sku}`;
      const existingQuantity = items.find((currentItem) => currentItem.key === key)?.quantity ?? 0;
      const addedQuantity = Math.min(requestedQuantity, Math.max(0, stock - existingQuantity));
      if (addedQuantity < 1) return { addedQuantity: 0, totalQuantity: existingQuantity };
      const primaryImage = getPrimaryImage(product.images);
      const { regularPrice, salePrice } = getVariantPricing(product, selectedVariant);
      const item: CartItem = { key, productId: product.id, slug: product.slug, name: product.name, imageUrl: selectedVariant.imageUrl || primaryImage?.url || "", imageAlt: primaryImage?.alt || product.name, variantSku: selectedVariant.sku, variantName: getVariantName(selectedVariant), colorHex: selectedVariant.colorHex, price: salePrice ?? regularPrice, quantity: addedQuantity, stock };
      setItems((current) => {
        const existing = current.find((currentItem) => currentItem.key === key);
        if (!existing) return [...current, item];
        return current.map((currentItem) => currentItem.key === key ? { ...currentItem, ...item, quantity: Math.min(currentItem.quantity + addedQuantity, item.stock), availabilityIssue: undefined } : currentItem);
      });
      return { addedQuantity, totalQuantity: Math.min(stock, existingQuantity + addedQuantity) };
    };
    const updateQuantity = (key: string, quantity: number) => setItems((current) => current.flatMap((item) => {
      if (item.key !== key) return [item];
      if (item.stock < 1) return [item];
      const nextQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
      return nextQuantity < 1 ? [] : [{ ...item, quantity: Math.min(nextQuantity, item.stock) }];
    }));
    const hasUnavailableItems = items.some((item) => item.stock < 1 || item.availabilityIssue);
    return { items, itemCount: items.reduce((total, item) => total + item.quantity, 0), subtotal: items.reduce((total, item) => item.stock > 0 && !item.availabilityIssue ? total + item.price * item.quantity : total, 0), isSyncing, hasUnavailableItems, addProduct, updateQuantity, removeItem: (key) => setItems((current) => current.filter((item) => item.key !== key)), clearCart: () => setItems([]), refreshCart };
  }, [items, isSyncing, refreshCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
