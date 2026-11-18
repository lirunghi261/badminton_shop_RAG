import { z } from "zod";
import { vietnamPhoneSchema } from "../../utils/phone.js";

export const idempotencyKeySchema = z.uuid().transform((key) => key.toLowerCase());

export const createCustomerOrderSchema = z.strictObject({
  customer: z.strictObject({
    fullName: z.string().trim().min(1).max(100),
    phone: vietnamPhoneSchema,
    email: z.string().trim().toLowerCase().max(160).pipe(z.union([z.email(), z.literal("")])).default(""),
  }),
  shippingAddress: z.strictObject({
    addressLine: z.string().trim().min(10).max(250),
  }),
  items: z.array(z.strictObject({
    productId: z.string().regex(/^[a-f\d]{24}$/i).transform((id) => id.toLowerCase()),
    sku: z.string().trim().min(1).max(100),
    quantity: z.number().int().min(1).max(999),
  })).min(1).max(50),
  paymentMethod: z.literal("cod"),
  customerNote: z.string().trim().max(500).default(""),
});

export const listCustomerOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER / 50).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateCustomerOrder = z.infer<typeof createCustomerOrderSchema>;
export type ListCustomerOrders = z.infer<typeof listCustomerOrdersSchema>;
