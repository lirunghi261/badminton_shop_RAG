import { Router } from "express";
import { authenticateCustomer } from "../../middlewares/auth.js";
import { AppError } from "../../utils/AppError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createCustomerOrderSchema,
  idempotencyKeySchema,
  listCustomerOrdersSchema,
} from "./customer-orders.schemas.js";
import { createCustomerOrder, getCustomerOrder, listCustomerOrders } from "./customer-orders.service.js";

export const customerOrdersRouter = Router();

customerOrdersRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
}, authenticateCustomer);

customerOrdersRouter.post("/", asyncHandler(async (request, response) => {
  const key = idempotencyKeySchema.parse(request.get("Idempotency-Key"));
  if (typeof request.body?.paymentMethod === "string" && request.body.paymentMethod !== "cod") {
    throw new AppError("Phương thức thanh toán chưa được hỗ trợ.", 400, "UNSUPPORTED_PAYMENT_METHOD");
  }
  const input = createCustomerOrderSchema.parse(request.body);
  const result = await createCustomerOrder(request.auth!.userId, key, input);
  response.status(result.replayed ? 200 : 201).json({ success: true, data: result });
}));

customerOrdersRouter.get("/", asyncHandler(async (request, response) => {
  const query = listCustomerOrdersSchema.parse(request.query);
  const result = await listCustomerOrders(request.auth!.userId, query);
  response.json({ success: true, data: result });
}));

customerOrdersRouter.get("/:orderId", asyncHandler(async (request, response) => {
  const orderId = String(request.params.orderId ?? "");
  const order = await getCustomerOrder(request.auth!.userId, orderId);
  response.json({ success: true, data: { order } });
}));
