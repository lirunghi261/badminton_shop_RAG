import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { previewRagData } from "./rag.controller.js";

export const ragRouter = Router();

ragRouter.get("/preview", asyncHandler(previewRagData));
