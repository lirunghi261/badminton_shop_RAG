import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ProductModel } from "../products/product.model.js";
import { BrandModel } from "../brands/brand.model.js";
import { CategoryModel } from "../categories/category.model.js";

export const cartCheckSchema = z.strictObject({
  items: z.array(z.strictObject({
    productId: z.string().regex(/^[a-f\d]{24}$/i).transform((id) => id.toLowerCase()),
    sku: z.string().trim().min(1).max(100),
    quantity: z.number().int().min(1).max(999),
    // Comparison only: server never uses the browser price to calculate totals.
    expectedUnitPrice: z.number().finite().nonnegative().optional(),
  })).min(1).max(50),
});

export const checkoutRouter = Router();
checkoutRouter.post("/check", rateLimit({
  windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false,
  message: { success: false, error: { code: "TOO_MANY_REQUESTS", message: "Vui lòng thử lại sau." } },
}), asyncHandler(async (request, response) => {
  const input = cartCheckSchema.parse(request.body);
  const grouped = new Map<string, { productId: string; sku: string; quantity: number; expected: number[] }>();
  for (const item of input.items) {
    const key = `${item.productId}:${item.sku}`;
    const line = grouped.get(key) ?? { productId: item.productId, sku: item.sku, quantity: 0, expected: [] };
    line.quantity += item.quantity;
    if (item.expectedUnitPrice !== undefined) line.expected.push(item.expectedUnitPrice);
    grouped.set(key, line);
  }
  const active = { status: "active" as const, deletedAt: null };
  const products = await ProductModel.find({ ...active, _id: { $in: input.items.map((item) => item.productId) } }).lean();
  const [categories, brands] = await Promise.all([
    CategoryModel.find({ ...active, _id: { $in: products.map((product) => product.category) } }).select("_id").lean(),
    BrandModel.find({ ...active, _id: { $in: products.map((product) => product.brand) } }).select("_id").lean(),
  ]);
  const categoryIds = new Set(categories.map((item) => String(item._id)));
  const brandIds = new Set(brands.map((item) => String(item._id)));
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const items = [...grouped.values()].map((line) => {
    const product = byId.get(line.productId);
    const available = product && categoryIds.has(String(product.category)) && brandIds.has(String(product.brand));
    const variant = available ? product.variants.find((item) => item.sku === line.sku) : undefined;
    if (!available || !variant) return {
      productId: line.productId, sku: line.sku, quantity: line.quantity,
      unitPrice: null, stock: null, lineTotal: null, priceChanged: false,
      issues: [available ? "SKU_UNAVAILABLE" : "PRODUCT_UNAVAILABLE"],
    };
    const regular = variant.price ?? product.basePrice;
    const sale = variant.salePrice ?? product.salePrice ?? regular;
    const unitPrice = Math.min(regular, sale);
    const priceChanged = line.expected.some((price) => price !== unitPrice);
    const issues: string[] = [];
    if (line.quantity > variant.stock) issues.push("OUT_OF_STOCK");
    if (priceChanged) issues.push("PRICE_CHANGED");
    return { productId: line.productId, sku: line.sku, quantity: line.quantity,
      unitPrice, stock: variant.stock, lineTotal: unitPrice * line.quantity, priceChanged, issues };
  });
  response.set("Cache-Control", "no-store").json({ success: true, data: {
    checkedAt: new Date().toISOString(), canCheckout: items.every((item) => item.issues.length === 0),
    items, subtotal: items.some((item) => item.lineTotal === null) ? null : items.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0),
    reservation: false,
  } });
}));
