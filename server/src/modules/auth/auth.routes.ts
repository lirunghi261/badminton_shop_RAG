import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate, authenticateCustomer, authorize } from "../../middlewares/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  customerLogin,
  customerLogout,
  customerRefresh,
  customerRegister,
  login,
  logout,
  me,
  refresh,
} from "./auth.controller.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Bạn đã thử đăng nhập quá nhiều lần." },
  },
});

export const authRouter = Router();
authRouter.post("/login", loginLimiter, asyncHandler(login));
authRouter.post("/customer/login", loginLimiter, asyncHandler(customerLogin));
authRouter.post("/customer/register", loginLimiter, asyncHandler(customerRegister));
authRouter.post("/customer/refresh", asyncHandler(customerRefresh));
authRouter.post("/customer/logout", asyncHandler(customerLogout));
authRouter.get("/customer/me", authenticateCustomer, asyncHandler(me));
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", authenticate, authorize("admin"), asyncHandler(me));

