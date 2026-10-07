import { Schema, Types, model, type Model } from "mongoose";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "completed",
  "cancelled",
] as const;

export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "refunded"] as const;
export const PAYMENT_METHODS = ["cod", "bank_transfer"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface OrderCustomer {
  fullName: string;
  phone: string;
  email?: string;
}

export interface OrderShippingAddress {
  addressLine: string;
  ward?: string;
  district?: string;
  province?: string;
}

export interface OrderItem {
  product: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  sku: string;
  productName: string;
  variantName: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderStatusHistoryEntry {
  from?: OrderStatus | null;
  to: OrderStatus;
  note: string;
  changedBy?: Types.ObjectId | null;
  changedAt: Date;
}

export interface OrderPaymentHistoryEntry {
  from?: PaymentStatus | null;
  to: PaymentStatus;
  note: string;
  changedBy?: Types.ObjectId | null;
  changedAt: Date;
}

export interface Order {
  orderCode: string;
  user?: Types.ObjectId | null;
  customer: OrderCustomer;
  shippingAddress: OrderShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentPaidAt?: Date | null;
  customerNote: string;
  adminNote: string;
  cancellationReason: string;
  statusHistory: OrderStatusHistoryEntry[];
  paymentHistory: OrderPaymentHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

type OrderModel = Model<Order>;

const customerSchema = new Schema<OrderCustomer>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema<OrderShippingAddress>(
  {
    addressLine: { type: String, required: true, trim: true, maxlength: 250 },
    ward: { type: String, trim: true, maxlength: 100, default: "" },
    district: { type: String, trim: true, maxlength: 100, default: "" },
    province: { type: String, trim: true, maxlength: 100, default: "" },
  },
  { _id: false },
);

const itemSchema = new Schema<OrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, default: null },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 100 },
    productName: { type: String, required: true, trim: true, maxlength: 180 },
    variantName: { type: String, trim: true, maxlength: 180, default: "" },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const statusHistorySchema = new Schema<OrderStatusHistoryEntry>(
  {
    from: { type: String, enum: [...ORDER_STATUSES, null], default: null },
    to: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    changedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const paymentHistorySchema = new Schema<OrderPaymentHistoryEntry>(
  {
    from: { type: String, enum: [...PAYMENT_STATUSES, null], default: null },
    to: { type: String, enum: PAYMENT_STATUSES, required: true },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    changedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new Schema<Order, OrderModel>(
  {
    orderCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    customer: { type: customerSchema, required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    items: {
      type: [itemSchema],
      required: true,
      validate: { validator: (items: OrderItem[]) => items.length > 0, message: "Đơn hàng phải có sản phẩm." },
    },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, required: true, default: "pending", index: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true, default: "cod" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, required: true, default: "unpaid", index: true },
    paymentPaidAt: { type: Date, default: null },
    customerNote: { type: String, trim: true, maxlength: 1000, default: "" },
    adminNote: { type: String, trim: true, maxlength: 1000, default: "" },
    cancellationReason: { type: String, trim: true, maxlength: 300, default: "" },
    statusHistory: { type: [statusHistorySchema], default: [] },
    paymentHistory: { type: [paymentHistorySchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ "customer.phone": 1 });

export const OrderModel = model<Order, OrderModel>("Order", orderSchema);
