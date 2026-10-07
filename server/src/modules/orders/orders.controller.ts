import type { Request, Response } from "express";
import {
  getOrderById,
  listOrders,
  updateOrderAdminNote,
  updateOrderStatus,
  updatePaymentStatus,
} from "./orders.service.js";
import {
  listOrdersQuerySchema,
  updateAdminNoteSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from "./orders.schemas.js";

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function currentAdminId(request: Request): string {
  return request.auth?.userId ?? "";
}

export async function getOrders(request: Request, response: Response): Promise<void> {
  const result = await listOrders(listOrdersQuerySchema.parse(request.query));
  response.json({ success: true, data: result });
}

export async function getOrder(request: Request, response: Response): Promise<void> {
  const order = await getOrderById(routeParam(request.params.orderId));
  response.json({ success: true, data: { order } });
}

export async function patchOrderStatus(request: Request, response: Response): Promise<void> {
  const input = updateOrderStatusSchema.parse(request.body);
  const order = await updateOrderStatus(
    routeParam(request.params.orderId),
    currentAdminId(request),
    input.status,
    input.note,
  );
  response.json({ success: true, data: { order } });
}

export async function patchPaymentStatus(request: Request, response: Response): Promise<void> {
  const input = updatePaymentStatusSchema.parse(request.body);
  const order = await updatePaymentStatus(
    routeParam(request.params.orderId),
    currentAdminId(request),
    input.paymentStatus,
    input.note,
  );
  response.json({ success: true, data: { order } });
}

export async function patchAdminNote(request: Request, response: Response): Promise<void> {
  const { adminNote } = updateAdminNoteSchema.parse(request.body);
  const order = await updateOrderAdminNote(routeParam(request.params.orderId), adminNote);
  response.json({ success: true, data: { order } });
}
