import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../../middlewares/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { login, logout, me, refresh } from "./auth.controller.js";

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
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", authenticate, asyncHandler(me));

