export type CatalogPrimitive = string | number | boolean | null;

export interface CatalogSpecification {
  key: string;
  label: string;
  value: CatalogPrimitive;
  unit: string;
}

export interface CatalogVariantAttribute {
  key: string;
  label: string;
  value: CatalogPrimitive;
}

export interface CatalogVariant {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  attributes: CatalogVariantAttribute[];
  price: number | null;
  salePrice: number | null;
  stock: number;
  imageUrl: string;
}

export interface CatalogImage {
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface NormalizedCatalogProduct {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  categoryName: string | null;
  basePrice: number | null;
  salePrice: number | null;
  effectivePrice: number | null;
  shortDescription: string;
  description: string;
  specifications: CatalogSpecification[];
  variants: CatalogVariant[];
  totalStock: number;
  primaryImage: CatalogImage | null;
  updatedAt: Date | null;
}

export interface ListCatalogProductsOptions {
  limit?: number;
}
