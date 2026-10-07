import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getOrder,
  getOrders,
  patchAdminNote,
  patchOrderStatus,
  patchPaymentStatus,
} from "./orders.controller.js";

export const ordersRouter = Router();

ordersRouter.use(authenticate, authorize("admin"));
ordersRouter.get("/", asyncHandler(getOrders));
ordersRouter.get("/:orderId", asyncHandler(getOrder));
ordersRouter.patch("/:orderId/status", asyncHandler(patchOrderStatus));
ordersRouter.patch("/:orderId/payment-status", asyncHandler(patchPaymentStatus));
ordersRouter.patch("/:orderId/admin-note", asyncHandler(patchAdminNote));
