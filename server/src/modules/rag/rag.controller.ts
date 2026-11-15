import type { Request, Response } from "express";
import { buildRagText, listCatalogProducts } from "../catalog/catalog.service.js";
import { buildRagDocument } from "./rag-document.js";

export async function previewRagData(_request: Request, response: Response): Promise<void> {
  const products = await listCatalogProducts({ limit: 3 });

  response.json({
    success: true,
    count: products.length,
    products: products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brandId: product.brandId,
      brandSlug: product.brandSlug,
      categoryId: product.categoryId,
      categorySlug: product.categorySlug,
      brandName: product.brandName,
      categoryName: product.categoryName,
      effectivePrice: product.effectivePrice,
      totalStock: product.totalStock,
      primaryImage: product.primaryImage,
      ragText: buildRagText(product),
      document: buildRagDocument(product),
    })),
  });
}
