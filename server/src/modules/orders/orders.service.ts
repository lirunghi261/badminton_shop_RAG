import { Types, type QueryFilter, type SortOrder } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import {
  OrderModel,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "./order.model.js";
import type { ListOrdersQuery } from "./orders.schemas.js";

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipping", "cancelled"],
  shipping: ["completed"],
  completed: [],
  cancelled: [],
};

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: ["pending", "paid", "failed"],
  pending: ["paid", "failed"],
  paid: ["refunded"],
  failed: ["pending", "paid"],
  refunded: [],
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertValidId(orderId: string) {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError("Mã đơn hàng không hợp lệ.", 400, "INVALID_ORDER_ID");
  }
}

function serializeOrder(order: Order & { _id: Types.ObjectId }) {
  return {
    source: order.orderCode.startsWith("DH-DEMO-") ? "demo" : order.source ?? "legacy",
    id: order._id.toString(),
    orderCode: order.orderCode,
    userId: order.user?.toString() ?? null,
    customer: {
      fullName: order.customer.fullName,
      phone: order.customer.phone,
      email: order.customer.email ?? "",
    },
    shippingAddress: {
      addressLine: order.shippingAddress.addressLine,
      ward: order.shippingAddress.ward ?? "",
      district: order.shippingAddress.district ?? "",
      province: order.shippingAddress.province ?? "",
    },
    items: order.items.map((item) => ({
      productId: item.product.toString(),
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
    paymentPaidAt: order.paymentPaidAt ?? null,
    customerNote: order.customerNote,
    adminNote: order.adminNote,
    cancellationReason: order.cancellationReason,
    statusHistory: order.statusHistory.map((entry) => ({
      from: entry.from ?? null,
      to: entry.to,
      note: entry.note,
      changedBy: entry.changedBy?.toString() ?? null,
      changedAt: entry.changedAt,
    })),
    paymentHistory: order.paymentHistory.map((entry) => ({
      from: entry.from ?? null,
      to: entry.to,
      note: entry.note,
      changedBy: entry.changedBy?.toString() ?? null,
      changedAt: entry.changedAt,
    })),
    allowedNextStatuses: allowedOrderStatuses(order),
    allowedNextPaymentStatuses: allowedPaymentStatuses(order),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function allowedOrderStatuses(order: Order) {
  return STATUS_TRANSITIONS[order.status].filter((status) => status !== "completed" || (
    order.paymentStatus === "paid" || (order.paymentMethod === "cod" && order.paymentStatus !== "refunded")
  ));
}

function allowedPaymentStatuses(order: Order) {
  return PAYMENT_TRANSITIONS[order.paymentStatus].filter((status) => (
    (status !== "paid" || order.status !== "cancelled") &&
    (status !== "refunded" || order.status === "cancelled" || order.status === "completed")
  ));
}

async function findOrder(orderId: string) {
  assertValidId(orderId);
  const order = await OrderModel.findById(orderId);
  if (!order) throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
  return order;
}

export async function listOrders(query: ListOrdersQuery) {
  const filter: QueryFilter<Order> = {};
  if (query.status !== "all") filter.status = query.status;
  if (query.paymentStatus !== "all") filter.paymentStatus = query.paymentStatus;
  if (query.paymentMethod !== "all") filter.paymentMethod = query.paymentMethod;
  if (query.search) {
    const expression = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [
      { orderCode: expression },
      { "customer.fullName": expression },
      { "customer.phone": expression },
      { "customer.email": expression },
    ];
  }
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(`${query.dateFrom}T00:00:00.000+07:00`);
    if (query.dateTo) filter.createdAt.$lte = new Date(`${query.dateTo}T23:59:59.999+07:00`);
  }

  const sortMap: Record<ListOrdersQuery["sort"], Record<string, SortOrder>> = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    total_desc: { total: -1, _id: 1 },
    total_asc: { total: 1, _id: 1 },
  };
  const skip = (query.page - 1) * query.limit;
  const [orders, total] = await Promise.all([
    OrderModel.find(filter).sort(sortMap[query.sort]).skip(skip).limit(query.limit).lean(),
    OrderModel.countDocuments(filter),
  ]);

  return {
    orders: orders.map((order) => serializeOrder(order)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getOrderById(orderId: string) {
  const order = await findOrder(orderId);
  return serializeOrder(order);
}

export async function updateOrderStatus(
  orderId: string,
  adminId: string,
  nextStatus: OrderStatus,
  note: string,
) {
  const order = await findOrder(orderId);
  if (order.status === nextStatus) return serializeOrder(order);
  if (!allowedOrderStatuses(order).includes(nextStatus)) {
    throw new AppError(
      `Không thể chuyển đơn từ ${order.status} sang ${nextStatus}.`,
      409,
      "INVALID_ORDER_STATUS_TRANSITION",
    );
  }
  if (nextStatus === "cancelled" && !note) {
    throw new AppError("Vui lòng nhập lý do hủy đơn.", 400, "CANCELLATION_REASON_REQUIRED");
  }

  const previousStatus = order.status;
  const previousPaymentStatus = order.paymentStatus;
  order.status = nextStatus;
  if (nextStatus === "cancelled") order.cancellationReason = note;
  order.statusHistory.push({
    from: previousStatus,
    to: nextStatus,
    note,
    changedBy: new Types.ObjectId(adminId),
    changedAt: new Date(),
  });

  if (nextStatus === "completed" && order.paymentMethod === "cod" && order.paymentStatus !== "paid") {
    const previousPaymentStatus = order.paymentStatus;
    order.paymentStatus = "paid";
    order.paymentPaidAt = new Date();
    order.paymentHistory.push({
      from: previousPaymentStatus,
      to: "paid",
      note: "Tự động xác nhận thanh toán khi hoàn tất đơn COD.",
      changedBy: new Types.ObjectId(adminId),
      changedAt: new Date(),
    });
  }

  const updated = await OrderModel.findOneAndUpdate(
    { _id: order._id, status: previousStatus, paymentStatus: previousPaymentStatus },
    {
      $set: { status: order.status, cancellationReason: order.cancellationReason, paymentStatus: order.paymentStatus, paymentPaidAt: order.paymentPaidAt },
      $push: {
        statusHistory: order.statusHistory[order.statusHistory.length - 1]!,
        ...(order.paymentStatus !== previousPaymentStatus ? { paymentHistory: order.paymentHistory[order.paymentHistory.length - 1]! } : {}),
      },
    },
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) throw new AppError("Đơn hàng vừa thay đổi. Vui lòng tải lại trước khi cập nhật.", 409, "ORDER_CHANGED");
  return serializeOrder(updated);
}

export async function updatePaymentStatus(
  orderId: string,
  adminId: string,
  nextStatus: PaymentStatus,
  note: string,
) {
  const order = await findOrder(orderId);
  if (order.paymentStatus === nextStatus) return serializeOrder(order);
  if (!allowedPaymentStatuses(order).includes(nextStatus)) {
    throw new AppError(
      `Không thể chuyển thanh toán từ ${order.paymentStatus} sang ${nextStatus}.`,
      409,
      "INVALID_PAYMENT_STATUS_TRANSITION",
    );
  }

  const previousStatus = order.paymentStatus;
  order.paymentStatus = nextStatus;
  order.paymentPaidAt = nextStatus === "paid" ? new Date() : order.paymentPaidAt;
  order.paymentHistory.push({
    from: previousStatus,
    to: nextStatus,
    note,
    changedBy: new Types.ObjectId(adminId),
    changedAt: new Date(),
  });
  const updated = await OrderModel.findOneAndUpdate(
    { _id: order._id, status: order.status, paymentStatus: previousStatus },
    {
      $set: { paymentStatus: order.paymentStatus, paymentPaidAt: order.paymentPaidAt },
      $push: { paymentHistory: order.paymentHistory[order.paymentHistory.length - 1]! },
    },
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) throw new AppError("Đơn hàng vừa thay đổi. Vui lòng tải lại trước khi cập nhật.", 409, "ORDER_CHANGED");
  return serializeOrder(updated);
}

export async function updateOrderAdminNote(orderId: string, adminNote: string) {
  const order = await findOrder(orderId);
  const updated = await OrderModel.findByIdAndUpdate(order._id, { $set: { adminNote } }, { returnDocument: "after", runValidators: true });
  if (!updated) throw new AppError("Không tìm thấy đơn hàng.", 404, "ORDER_NOT_FOUND");
  return serializeOrder(updated);
}
