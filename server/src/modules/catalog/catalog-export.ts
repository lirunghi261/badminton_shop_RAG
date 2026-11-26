import { createHash } from "node:crypto";
import { slugify } from "../../utils/slugify.js";
import type { NormalizedCatalogProduct } from "./catalog.types.js";

const schemaVersion = 1;
const objectIdPattern = /^[a-f0-9]{24}$/;

export function buildCatalogExport(catalog: readonly NormalizedCatalogProduct[]) {
  const productIds = new Set<string>();
  const slugs = new Set<string>();

  const products = catalog.map((product) => {
    const { id: productId, slug, brandId, categoryId } = product;
    if (![productId, brandId, categoryId].every((id) => objectIdPattern.test(id)) || !slug || slugify(slug) !== slug) {
      throw new Error(`Invalid catalog identity for product ${productId}`);
    }
    if (productIds.has(productId) || slugs.has(slug)) {
      throw new Error(`Duplicate catalog identity for product ${productId}`);
    }
    productIds.add(productId);
    slugs.add(slug);

    return {
      productId,
      slug,
      sourceUrl: `/products/${slug}`,
      name: product.name,
      brandId,
      brandSlug: product.brandSlug,
      brandName: product.brandName,
      categoryId,
      categorySlug: product.categorySlug,
      categoryName: product.categoryName,
      shortDescription: product.shortDescription,
      description: product.description,
      specifications: [...product.specifications].sort((a, b) => a.key.localeCompare(b.key, "en")),
      variants: product.variants
        .map(({ sku, colorName, attributes }) => ({
          sku,
          colorName,
          attributes: [...attributes].sort((a, b) => a.key.localeCompare(b.key, "en")),
        }))
        .sort((a, b) => a.sku.localeCompare(b.sku, "en")),
    };
  }).sort((a, b) => a.productId.localeCompare(b.productId, "en"));

  const datasetVersion = createHash("sha256")
    .update(JSON.stringify({ schemaVersion, products }))
    .digest("hex");

  return { schemaVersion, datasetVersion, productCount: products.length, products };
}
