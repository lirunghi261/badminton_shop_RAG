import mongoose, { type ClientSession } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { ProductModel } from "../products/product.model.js";
import type { OrderItem } from "./order.model.js";

export async function runOrderTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  try {
    const options = { readPreference: "primary", timeoutMS: 10_000 } as const;
    return await mongoose.connection.transaction(work, options);
  } catch (error) {
    if (
      error instanceof mongoose.mongo.MongoNetworkError ||
      error instanceof mongoose.mongo.MongoServerSelectionError ||
      error instanceof mongoose.mongo.MongoOperationTimeoutError ||
      (error instanceof mongoose.mongo.MongoServerError && (
        error.code === 20 ||
        error.hasErrorLabel("TransientTransactionError") ||
        error.hasErrorLabel("UnknownTransactionCommitResult")
      ))
    ) {
      throw new AppError("Chưa thể xác nhận giao dịch. Vui lòng thử lại.", 503, "CHECKOUT_UNAVAILABLE");
    }
    throw error;
  }
}

export async function reserveOrderStock(items: OrderItem[], session: ClientSession) {
  for (const item of items) {
    const updated = await ProductModel.updateOne(
      { _id: item.product, variants: { $elemMatch: { sku: item.sku, stock: { $gte: item.quantity } } } },
      { $inc: { "variants.$.stock": -item.quantity } },
      { session },
    );
    if (updated.matchedCount !== 1) {
      throw new AppError("Số lượng tồn kho vừa thay đổi.", 409, "OUT_OF_STOCK");
    }
  }
}

export async function restoreOrderStock(items: OrderItem[], session: ClientSession) {
  for (const item of items) {
    const updated = await ProductModel.updateOne(
      { _id: item.product, "variants.sku": item.sku },
      { $inc: { "variants.$.stock": item.quantity } },
      { session },
    );
    if (updated.matchedCount !== 1) {
      throw new AppError(
        `Không tìm thấy SKU ${item.sku} để hoàn tồn. Vui lòng khôi phục SKU trước khi hủy đơn.`,
        409,
        "RESTOCK_SKU_UNAVAILABLE",
      );
    }
  }
}
