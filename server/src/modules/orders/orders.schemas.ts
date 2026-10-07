import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "./order.model.js";

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(100).default(10),
  search: z.string().trim().max(120).default(""),
  status: z.enum(["all", ...ORDER_STATUSES]).default("all"),
  paymentStatus: z.enum(["all", ...PAYMENT_STATUSES]).default("all"),
  paymentMethod: z.enum(["all", ...PAYMENT_METHODS]).default("all"),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  sort: z.enum(["newest", "oldest", "total_desc", "total_asc"]).default("newest"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).default(""),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES),
  note: z.string().trim().max(300).default(""),
});

export const updateAdminNoteSchema = z.object({
  adminNote: z.string().trim().max(1000),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
