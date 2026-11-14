import type { StorefrontProduct, StorefrontProductImage, StorefrontProductVariant } from "../../api/storefront/products.api";

const currencyFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function getPrimaryImage(images: StorefrontProductImage[]) {
  return [...images].sort((first, second) => first.sortOrder - second.sortOrder).find((image) => image.isPrimary) ?? images[0];
}

export function getVariantPricing(product: StorefrontProduct, variant?: StorefrontProductVariant) {
  const regularPrice = variant?.price ?? product.basePrice;
  const salePrice = variant?.salePrice ?? product.salePrice ?? null;
  return { regularPrice, salePrice: salePrice != null && salePrice < regularPrice ? salePrice : null };
}

export function getVariantName(variant: StorefrontProductVariant) {
  const attributes = (variant.attributes ?? [])
    .map((attribute) => String(attribute.value))
    .filter(Boolean);
  return [variant.colorName, ...attributes].filter(Boolean).join(" · ");
}

export function getStartingPricing(product: StorefrontProduct) {
  const prices = product.variants.map((variant) => getVariantPricing(product, variant));
  return prices.reduce<ReturnType<typeof getVariantPricing> | undefined>((lowest, price) => {
    if (!lowest || (price.salePrice ?? price.regularPrice) < (lowest.salePrice ?? lowest.regularPrice)) return price;
    return lowest;
  }, undefined) ?? getVariantPricing(product);
}

export function getStartingPrice(product: StorefrontProduct) {
  const { salePrice, regularPrice } = getStartingPricing(product);
  return salePrice ?? regularPrice;
}
