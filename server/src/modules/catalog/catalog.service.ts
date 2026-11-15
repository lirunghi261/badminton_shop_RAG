import mongoose, { type PipelineStage, Types } from "mongoose";
import sanitizeHtml from "sanitize-html";
import { AppError } from "../../utils/AppError.js";
import type {
  CatalogImage,
  CatalogPrimitive,
  CatalogSpecification,
  CatalogVariant,
  CatalogVariantAttribute,
  ListCatalogProductsOptions,
  NormalizedCatalogProduct,
} from "./catalog.types.js";

type RawObject = Record<string, unknown>;

interface ProductWithLookups extends RawObject {
  _id?: unknown;
  slug?: unknown;
  name?: unknown;
  brand?: RawObject | null;
  category?: RawObject | null;
  shortDescription?: unknown;
  description?: unknown;
  basePrice?: unknown;
  salePrice?: unknown;
  images?: unknown;
  specifications?: unknown;
  variants?: unknown;
  updatedAt?: unknown;
}

export async function listCatalogProducts(
  options: ListCatalogProductsOptions = {},
): Promise<NormalizedCatalogProduct[]> {
  const database = mongoose.connection.db;
  if (!database) {
    throw new AppError("Database is not connected", 500, "DATABASE_NOT_CONNECTED");
  }

  const pipeline: PipelineStage[] = [
    { $match: { status: "active", deletedAt: null } },
    { $sort: { updatedAt: -1, _id: 1 } },
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        "brand.status": "active",
        "brand.deletedAt": null,
        "category.status": "active",
        "category.deletedAt": null,
      },
    },
  ];

  if (typeof options.limit === "number") {
    pipeline.push({ $limit: options.limit });
  }

  const products = await database.collection<ProductWithLookups>("products").aggregate(pipeline).toArray();
  return products.map(normalizeCatalogProduct);
}

export function buildRagText(product: NormalizedCatalogProduct): string {
  const lines = [
    `Tên sản phẩm: ${product.name}`,
    `Thương hiệu: ${product.brandName ?? "Chưa có dữ liệu"}`,
    `Danh mục: ${product.categoryName ?? "Chưa có dữ liệu"}`,
    `Mô tả ngắn: ${product.shortDescription || "Chưa có dữ liệu"}`,
    `Mô tả: ${product.description || "Chưa có dữ liệu"}`,
    "Thông số kỹ thuật:",
  ];

  if (product.specifications.length > 0) {
    lines.push(
      ...[...product.specifications].sort((a, b) => a.key.localeCompare(b.key, "en")).map((specification) => {
        const unit = specification.unit ? ` ${specification.unit}` : "";
        return `- ${specification.label}: ${formatPrimitive(specification.value)}${unit}`;
      }),
    );
  } else {
    lines.push("- Chưa có dữ liệu");
  }

  if (product.variants.length > 0) {
    lines.push("Biến thể:");
    lines.push(
      ...[...product.variants].sort((a, b) => a.sku.localeCompare(b.sku, "en")).map((variant) => {
        const attributes = [...variant.attributes].sort((a, b) => a.key.localeCompare(b.key, "en"))
          .map((attribute) => `${attribute.label}: ${formatPrimitive(attribute.value)}`)
          .join(", ");
        const details = attributes ? `; ${attributes}` : "";
        return `- SKU ${variant.sku}: màu ${variant.colorName || "Chưa có dữ liệu"}${details}`;
      }),
    );
  }

  return lines.join("\n");
}

function resolveEffectivePrice(regular: number | null, sale: number | null) {
  return regular !== null && sale !== null && sale < regular ? sale : regular;
}

function normalizeCatalogProduct(product: ProductWithLookups): NormalizedCatalogProduct {
  const basePrice = toNullableNumber(product.basePrice);
  const salePrice = toNullableNumber(product.salePrice);
  const variants = normalizeVariants(product.variants, basePrice, salePrice);
  const skuPrices = variants.flatMap((variant) => variant.effectivePrice === null ? [] : [variant.effectivePrice]);
  const effectivePrice = skuPrices.length ? Math.min(...skuPrices) : resolveEffectivePrice(basePrice, salePrice);
  const images = normalizeImages(product.images);

  return {
    id: toId(product._id),
    slug: toStringValue(product.slug),
    name: toStringValue(product.name),
    brandId: toId(product.brand?._id),
    brandSlug: toStringValue(product.brand?.slug),
    categoryId: toId(product.category?._id),
    categorySlug: toStringValue(product.category?.slug),
    brandName: getLookupName(product.brand),
    categoryName: getLookupName(product.category),
    basePrice,
    salePrice,
    effectivePrice,
    shortDescription: cleanText(toStringValue(product.shortDescription)),
    description: cleanText(toStringValue(product.description)),
    specifications: normalizeSpecifications(product.specifications),
    variants,
    totalStock: variants.reduce((total, variant) => total + variant.stock, 0),
    primaryImage: selectPrimaryImage(images),
    updatedAt: toNullableDate(product.updatedAt),
  };
}

function normalizeSpecifications(value: unknown): CatalogSpecification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const specification = toObject(item);
    return {
      key: toStringValue(specification.key),
      label: toStringValue(specification.label),
      value: toPrimitive(specification.value),
      unit: toStringValue(specification.unit),
    };
  });
}

function normalizeVariants(value: unknown, basePrice: number | null, productSalePrice: number | null): CatalogVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const variant = toObject(item);
    const price = toNullableNumber(variant.price);
    const salePrice = toNullableNumber(variant.salePrice);
    return {
      id: toId(variant._id),
      sku: toStringValue(variant.sku),
      colorName: toStringValue(variant.colorName),
      colorHex: toStringValue(variant.colorHex),
      attributes: normalizeVariantAttributes(variant.attributes),
      price,
      salePrice,
      effectivePrice: resolveEffectivePrice(price ?? basePrice, salePrice ?? productSalePrice),
      stock: toNumber(variant.stock),
      imageUrl: toStringValue(variant.imageUrl),
    };
  });
}

function normalizeVariantAttributes(value: unknown): CatalogVariantAttribute[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const attribute = toObject(item);
    return {
      key: toStringValue(attribute.key),
      label: toStringValue(attribute.label),
      value: toPrimitive(attribute.value),
    };
  });
}

function normalizeImages(value: unknown): CatalogImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const image = toObject(item);
    return {
      url: toStringValue(image.url),
      alt: toStringValue(image.alt),
      isPrimary: image.isPrimary === true,
      sortOrder: toNumber(image.sortOrder),
    };
  });
}

function selectPrimaryImage(images: CatalogImage[]): CatalogImage | null {
  if (images.length === 0) {
    return null;
  }

  return (
    images.find((image) => image.isPrimary) ??
    [...images].sort((first, second) => first.sortOrder - second.sortOrder)[0] ??
    null
  );
}

function getLookupName(value: RawObject | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const name = toStringValue(value.name);
  return name || null;
}

function toObject(value: unknown): RawObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as RawObject;
}

function toId(value: unknown): string {
  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  if (value && typeof value === "object" && "toString" in value) {
    return String(value);
  }

  return toStringValue(value);
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNullableDate(value: unknown): Date | null {
  return value instanceof Date ? value : null;
}

function toPrimitive(value: unknown): CatalogPrimitive {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }

  return "";
}

function cleanText(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}

function formatPrimitive(value: CatalogPrimitive): string {
  if (value === null || value === "") {
    return "Chưa có dữ liệu";
  }

  return String(value);
}
