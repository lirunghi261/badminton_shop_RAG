import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getDashboardSummary } from "./dashboard.controller.js";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, authorize("admin"));
dashboardRouter.get("/summary", asyncHandler(getDashboardSummary));

