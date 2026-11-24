import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { checkCart } from "../api/storefront/checkout.api";
import type { StorefrontProduct, StorefrontProductVariant } from "../api/storefront/products.api";
import { getPrimaryImage, getVariantName, getVariantPricing } from "../components/storefront/productPresentation";
import { CartContext, type CartAddResult, type CartContextValue, type CartItem } from "./cartContext";

const storageKey = "badminton-shop-cart";
const storageVersion = 2;
const maxQuantity = 999;
const objectIdPattern = /^[a-f\d]{24}$/i;

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function toStoredItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<CartItem>;
  if (typeof item.productId !== "string" || !objectIdPattern.test(item.productId) || typeof item.variantSku !== "string" || !item.variantSku || !isPositiveInteger(item.quantity) || typeof item.price !== "number" || !Number.isFinite(item.price) || item.price < 0) return null;
  const quantity = Math.min(item.quantity, maxQuantity);
  const price = item.price;
  const productId = item.productId.toLowerCase();
  const variantSku = item.variantSku.trim();
  if (!variantSku || variantSku.length > 100) return null;
  const stock = typeof item.stock === "number" && Number.isFinite(item.stock) ? Math.max(0, Math.floor(item.stock)) : 0;
  const unavailable = item.availabilityIssue === "PRODUCT_UNAVAILABLE" || item.availabilityIssue === "SKU_UNAVAILABLE"
    ? item.availabilityIssue : undefined;
  return {
    key: `${productId}:${variantSku}`,
    productId, slug: typeof item.slug === "string" ? item.slug : "",
    name: typeof item.name === "string" ? item.name : "Sản phẩm không còn khả dụng",
    imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
    imageAlt: typeof item.imageAlt === "string" ? item.imageAlt : "",
    variantSku, variantName: typeof item.variantName === "string" ? item.variantName : variantSku,
    colorHex: typeof item.colorHex === "string" ? item.colorHex : "", price,
    quantity, stock, availabilityIssue: unavailable ?? (stock > 0 ? undefined : "OUT_OF_STOCK"),
    priceChanged: item.priceChanged === true,
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
      byKey.set(item.key, existing ? { ...existing, quantity: Math.min(maxQuantity, existing.quantity + item.quantity), priceChanged: existing.priceChanged || item.priceChanged } : item);
    }
    return [...byKey.values()];
  } catch { return []; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(getStoredCart);
  const latestItems = useRef(items);
  const pendingCheck = useRef<Promise<boolean> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  const replaceItems = useCallback((next: CartItem[], persist = true) => {
    latestItems.current = next;
    setItems(next);
    if (!persist) return;
    try {
      const serialized = JSON.stringify({ version: storageVersion, items: next });
      if (window.localStorage.getItem(storageKey) !== serialized) window.localStorage.setItem(storageKey, serialized);
    } catch {
      // Keep the current cart usable when browser storage is unavailable.
    }
  }, []);

  const refreshCart = useCallback((): Promise<boolean> => {
    if (pendingCheck.current) return pendingCheck.current;
    const snapshot = latestItems.current;
    if (!snapshot.length) return Promise.resolve(false);
    setIsSyncing(true);
    setSyncError(false);
    const sync = async () => {
      try {
        const request = snapshot.map((item) => ({ productId: item.productId, sku: item.variantSku, quantity: item.quantity, expectedUnitPrice: item.price }));
        const batches = [];
        for (let offset = 0; offset < request.length; offset += 50) batches.push(checkCart(request.slice(offset, offset + 50)));
        const checked = (await Promise.all(batches)).flat();
        if (latestItems.current !== snapshot) return false;
        const byKey = new Map(checked.map((item) => [`${item.productId}:${item.sku}`, item]));
        const next = snapshot.map((item) => {
          const fresh = byKey.get(item.key);
          if (!fresh) throw new Error("Missing checked cart line");
          const unavailable = fresh.issues.find((issue) => issue === "PRODUCT_UNAVAILABLE" || issue === "SKU_UNAVAILABLE");
          const stock = Math.max(0, Math.floor(fresh.stock ?? 0));
          return { ...item, stock, quantity: stock > 0 ? Math.min(item.quantity, stock) : item.quantity,
            price: fresh.unitPrice ?? item.price, priceChanged: item.priceChanged || fresh.priceChanged,
            availabilityIssue: unavailable ?? (stock < 1 ? "OUT_OF_STOCK" as const : undefined) };
        });
        replaceItems(next);
        return next.every((item) => !item.availabilityIssue && !item.priceChanged);
      } catch {
        setSyncError(true);
        return false;
      } finally {
        pendingCheck.current = null;
        setIsSyncing(false);
      }
    };
    pendingCheck.current = sync();
    return pendingCheck.current;
  }, [replaceItems]);

  useEffect(() => {
    replaceItems(latestItems.current);
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && (event.key === storageKey || event.key === null)) replaceItems(getStoredCart(), false);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [replaceItems]);

  const value = useMemo<CartContextValue>(() => {
    const addProduct = (product: StorefrontProduct, variant?: StorefrontProductVariant, quantity = 1): CartAddResult | null => {
      const selectedVariant = variant ?? product.variants.find((candidate) => candidate.stock > 0) ?? product.variants[0];
      const stock = selectedVariant ? Math.max(0, Math.floor(selectedVariant.stock)) : 0;
      if (!selectedVariant || stock < 1) return null;
      const limit = Math.min(stock, maxQuantity);
      const requestedQuantity = Number.isFinite(quantity) ? Math.min(Math.max(1, Math.floor(quantity)), limit) : 1;
      const key = `${product.id}:${selectedVariant.sku}`;
      const current = latestItems.current;
      const existing = current.find((currentItem) => currentItem.key === key);
      const existingQuantity = existing?.quantity ?? 0;
      const addedQuantity = Math.min(requestedQuantity, Math.max(0, limit - existingQuantity));
      if (addedQuantity < 1) return { addedQuantity: 0, totalQuantity: existingQuantity };
      const primaryImage = getPrimaryImage(product.images);
      const { regularPrice, salePrice } = getVariantPricing(product, selectedVariant);
      const item: CartItem = { key, productId: product.id, slug: product.slug, name: product.name, imageUrl: selectedVariant.imageUrl || primaryImage?.url || "", imageAlt: primaryImage?.alt || product.name, variantSku: selectedVariant.sku, variantName: getVariantName(selectedVariant), colorHex: selectedVariant.colorHex, price: salePrice ?? regularPrice, quantity: addedQuantity, stock };
      const totalQuantity = existingQuantity + addedQuantity;
      replaceItems(existing ? current.map((currentItem) => currentItem.key === key
        ? { ...item, quantity: totalQuantity, priceChanged: existing.priceChanged || existing.price !== item.price } : currentItem) : [...current, item]);
      return { addedQuantity, totalQuantity };
    };
    const updateQuantity = (key: string, quantity: number) => replaceItems(latestItems.current.flatMap((item) => {
      if (item.key !== key) return [item];
      if (item.stock < 1) return [item];
      const nextQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
      return nextQuantity < 1 ? [] : [{ ...item, quantity: Math.min(nextQuantity, item.stock, maxQuantity) }];
    }));
    const hasUnavailableItems = items.some((item) => item.stock < 1 || item.availabilityIssue);
    return {
      items, itemCount: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: items.reduce((total, item) => item.stock > 0 && !item.availabilityIssue ? total + item.price * item.quantity : total, 0),
      isSyncing, syncError, hasUnavailableItems, hasPriceChanges: items.some((item) => item.priceChanged),
      addProduct, updateQuantity, refreshCart,
      removeItem: (key) => replaceItems(latestItems.current.filter((item) => item.key !== key)),
      clearCart: () => replaceItems([]),
      removePurchasedItems: (purchased) => {
        const quantities = new Map(purchased.map((item) => [`${item.productId}:${item.sku}`, item.quantity]));
        replaceItems(latestItems.current.flatMap((item) => {
          const quantity = item.quantity - (quantities.get(item.key) ?? 0);
          return quantity > 0 ? [{ ...item, quantity }] : [];
        }));
      },
      acceptPrices: () => replaceItems(latestItems.current.map((item) => ({ ...item, priceChanged: false }))),
    };
  }, [items, isSyncing, syncError, refreshCart, replaceItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
