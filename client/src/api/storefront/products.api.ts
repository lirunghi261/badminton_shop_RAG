import { http } from "../core/http";

export interface StorefrontCatalogReference {
  _id: string;
  name: string;
  slug: string;
}

export interface StorefrontProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface StorefrontProductSpecification {
  key: string;
  label: string;
  value: string | number | boolean;
  unit: string;
}

export interface StorefrontProductVariantAttribute {
  key: string;
  label: string;
  value: string | number | boolean;
}

export interface StorefrontProductVariant {
  _id?: string;
  sku: string;
  colorName: string;
  colorHex: string;
  price?: number | null;
  salePrice?: number | null;
  stock: number;
  imageUrl?: string;
  attributes?: StorefrontProductVariantAttribute[];
}

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  category: StorefrontCatalogReference;
  brand: StorefrontCatalogReference;
  shortDescription: string;
  description: string;
  basePrice: number;
  salePrice?: number | null;
  images: StorefrontProductImage[];
  specifications: StorefrontProductSpecification[];
  variants: StorefrontProductVariant[];
  totalStock: number;
}

export interface StorefrontProductListParams {
  page: number;
  limit: number;
  search: string;
  category: string;
  brand: string;
  sort: "newest" | "price-asc" | "price-desc";
  minPrice?: number;
  maxPrice?: number;
  inStock?: "true" | "false";
  facets?: string;
}

export interface StorefrontProductFacet {
  key: string;
  label: string;
  scope: "variant" | "specification";
  options: string[];
}

export interface StorefrontProductListResult {
  products: StorefrontProduct[];
  filters: {
    categories: Array<Pick<StorefrontCatalogReference, "name" | "slug">>;
    brands: Array<Pick<StorefrontCatalogReference, "name" | "slug">>;
    facets: StorefrontProductFacet[];
  };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function getStorefrontProducts(params: StorefrontProductListParams): Promise<StorefrontProductListResult> {
  const response = await http.get<{ success: true; data: StorefrontProductListResult }>("/products", { params });
  return response.data.data;
}

export async function getStorefrontProduct(slug: string): Promise<StorefrontProduct> {
  const response = await http.get<{ success: true; data: { product: StorefrontProduct } }>(`/products/${slug}`);
  return response.data.data.product;
}
