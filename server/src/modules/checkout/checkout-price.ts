import type { Product, ProductVariant } from "../products/product.model.js";

export function checkoutUnitPrice(product: Product, variant: ProductVariant): number {
  const regular = variant.price ?? product.basePrice;
  const sale = variant.salePrice ?? product.salePrice ?? regular;
  return Math.min(regular, sale);
}
