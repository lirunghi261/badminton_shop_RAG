import { createHash } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { BrandModel } from "../brands/brand.model.js";
import { CategoryModel } from "../categories/category.model.js";
import { checkoutUnitPrice } from "../checkout/checkout-price.js";
import { ProductModel, type ProductVariant } from "../products/product.model.js";
import type { CreateCustomerOrder, ListCustomerOrders } from "./customer-orders.schemas.js";
import { OrderModel, type Order, type OrderItem } from "./order.model.js";
import { reserveOrderStock, runOrderTransaction } from "./order-transaction.js";

type CartLine = CreateCustomerOrder["items"][number];

function normalizeLines(items: CartLine[]): CartLine[] {
  const lines = new Map<string, CartLine>();
  for (const item of items) {
    const key = `${item.productId}:${item.sku}`;
    const previous = lines.get(key);
    lines.set(key, { ...item, quantity: item.quantity + (previous?.quantity ?? 0) });
  }
  return [...lines.keys()].sort().map((key) => lines.get(key)!);
}

async function priceOrder(lines: CartLine[], session: ClientSession): Promise<OrderItem[]> {
  const active = { status: "active" as const, deletedAt: null };
  const products = await ProductModel.find({
    ...active,
    _id: { $in: lines.map((line) => line.productId) },
  }).session(session).lean();
  const categories = await CategoryModel.find({
    ...active,
    _id: { $in: products.map((product) => product.category) },
  }).select("_id").session(session).lean();
  const brands = await BrandModel.find({
    ...active,
    _id: { $in: products.map((product) => product.brand) },
  }).select("_id").session(session).lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const categoryIds = new Set(categories.map((category) => String(category._id)));
  const brandIds = new Set(brands.map((brand) => String(brand._id)));

  return lines.map(({ productId, sku, quantity }) => {
    const product = byId.get(productId);
    if (!product || !categoryIds.has(String(product.category)) || !brandIds.has(String(product.brand))) {
      throw new AppError("Sản phẩm không còn được bán.", 409, "PRODUCT_UNAVAILABLE");
    }
    const variant = product.variants.find((item) => item.sku === sku) as
      (ProductVariant & { _id?: Types.ObjectId }) | undefined;
    if (!variant) throw new AppError("SKU không thuộc sản phẩm hoặc không còn khả dụng.", 409, "PRODUCT_UNAVAILABLE");
    if (variant.stock < quantity) throw new AppError("Sản phẩm không đủ tồn kho.", 409, "OUT_OF_STOCK");

    const unitPrice = checkoutUnitPrice(product, variant);
    return {
      product: product._id,
      variantId: variant._id,
      sku,
      productName: product.name,
      variantName: variant.colorName,
      imageUrl: variant.imageUrl || product.images.find((image) => image.isPrimary)?.url || product.images[0]?.url || "",
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
    };
  });
}

function serializeCustomerOrder(order: Order & { _id: Types.ObjectId }) {
  return {
    id: String(order._id),
    orderCode: order.orderCode,
    source: order.source,
    customer: { fullName: order.customer.fullName, phone: order.customer.phone, email: order.customer.email ?? "" },
    shippingAddress: { addressLine: order.shippingAddress.addressLine },
    items: order.items.map((item) => ({
      productId: String(item.product),
      variantId: item.variantId?.toString() ?? null,
      sku: item.sku,
      productName: item.productName,
      variantName: item.variantName,
      imageUrl: item.imageUrl,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    total: order.total,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customerNote: order.customerNote,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function replayOrder(order: Order & { _id: Types.ObjectId }, requestHash: string) {
  if (order.requestHash !== requestHash) {
    throw new AppError("Khóa gửi lại đã dùng cho nội dung đơn hàng khác.", 409, "IDEMPOTENCY_CONFLICT");
  }
  return { order: serializeCustomerOrder(order), replayed: true };
}

export async function createCustomerOrder(userId: string, idempotencyKey: string, input: CreateCustomerOrder) {
  const lines = normalizeLines(input.items);
  const requestHash = createHash("sha256").update(JSON.stringify({ ...input, items: lines })).digest("hex");
  const user = new Types.ObjectId(userId);
  const filter = { user, source: "checkout" as const, idempotencyKey };
  await OrderModel.init();

  try {
    return await runOrderTransaction(async (session) => {
      const previous = await OrderModel.findOne(filter).session(session).lean();
      if (previous) return replayOrder(previous, requestHash);

      const items = await priceOrder(lines, session);
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const orderId = new Types.ObjectId();
      const order = new OrderModel({
        _id: orderId,
        orderCode: `DH-${orderId.toHexString().toUpperCase()}`,
        ...filter,
        requestHash,
        customer: input.customer,
        shippingAddress: input.shippingAddress,
        customerNote: input.customerNote,
        items,
        subtotal,
        shippingFee: 0,
        discount: 0,
        total: subtotal,
        status: "pending",
        paymentMethod: input.paymentMethod,
        paymentStatus: "unpaid",
        statusHistory: [{ to: "pending", changedBy: user }],
        paymentHistory: [{ to: "unpaid", changedBy: user }],
      });
      await order.save({ session });
      await reserveOrderStock(items, session);
      return { order: serializeCustomerOrder(order), replayed: false };
    });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      // A concurrent transaction may have committed the same key first.
      const previous = await OrderModel.findOne(filter).lean();
      if (previous) return replayOrder(previous, requestHash);
    }
    throw error;
  }
}

export async function listCustomerOrders(userId: string, { page, limit }: ListCustomerOrders) {
  const filter = { user: userId, source: "checkout" as const };
  const [orders, total] = await Promise.all([
    OrderModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    OrderModel.countDocuments(filter),
  ]);
  return {
    orders: orders.map(serializeCustomerOrder),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getCustomerOrder(userId: string, orderId: string) {
  const order = Types.ObjectId.isValid(orderId)
    ? await OrderModel.findOne({ _id: orderId, user: userId, source: "checkout" }).lean()
    : null;
  if (!order) throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
  return serializeCustomerOrder(order);
}
