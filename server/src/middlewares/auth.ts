import type { RequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../modules/auth/auth.tokens.js";
import type { UserRole } from "../modules/users/user.model.js";

export const authenticate: RequestHandler = (request, _response, next) => {
  const token = request.cookies?.accessToken as string | undefined;
  if (!token) {
    next(new AppError("Bạn chưa đăng nhập.", 401, "UNAUTHENTICATED"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch (error) {
    next(error);
  }
};

export function authorize(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      next(new AppError("Bạn không có quyền thực hiện thao tác này.", 403, "FORBIDDEN"));
      return;
    }
    next();
  };
}

