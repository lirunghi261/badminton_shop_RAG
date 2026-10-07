import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { normalizeVietnamPhone } from "../../utils/phone.js";
import { UserModel } from "../users/user.model.js";
import {
  customerLoginSchema,
  customerRegisterSchema,
  loginSchema,
} from "./auth.schemas.js";
import {
  clearAuthCookies,
  clearCustomerAuthCookies,
  createAccessToken,
  createRefreshToken,
  hashToken,
  setAuthCookies,
  setCustomerAuthCookies,
  verifyRefreshToken,
} from "./auth.tokens.js";

function publicUser(user: { id: string; name: string; email: string; phone?: string; role: string; status: string }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    status: user.status,
  };
}

function isDuplicateKeyError(error: unknown): error is { code: number; keyPattern?: Record<string, number> } {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);
}

async function startSession(user: Awaited<ReturnType<typeof UserModel.findOne>>, response: Response) {
  if (!user) return;
  const accessToken = createAccessToken(user.id, user.role);
  const refreshToken = createRefreshToken(user.id, user.role);
  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();
  setAuthCookies(response, accessToken, refreshToken);
}

async function startCustomerSession(user: Awaited<ReturnType<typeof UserModel.findOne>>, response: Response) {
  if (!user) return;
  const accessToken = createAccessToken(user.id, user.role);
  const refreshToken = createRefreshToken(user.id, user.role);
  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();
  setCustomerAuthCookies(response, accessToken, refreshToken);
}

export async function login(request: Request, response: Response): Promise<void> {
  const credentials = loginSchema.parse(request.body);
  const user = await UserModel.findOne({ email: credentials.email, deletedAt: null }).select(
    "+password +refreshTokenHash",
  );

  if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
    throw new AppError("Email hoặc mật khẩu không đúng.", 401, "INVALID_CREDENTIALS");
  }
  if (user.status !== "active") {
    throw new AppError("Tài khoản đã bị khóa.", 403, "ACCOUNT_BLOCKED");
  }
  if (user.role !== "admin") {
    throw new AppError("Tài khoản không có quyền truy cập trang quản trị.", 403, "ADMIN_ONLY");
  }

  await startSession(user, response);

  response.json({ success: true, data: { user: publicUser(user) } });
}

export async function customerLogin(request: Request, response: Response): Promise<void> {
  const credentials = customerLoginSchema.parse(request.body);
  const normalizedEmail = credentials.identifier.toLowerCase();
  const normalizedPhone = normalizeVietnamPhone(credentials.identifier);
  const user = await UserModel.findOne({
    $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    deletedAt: null,
  }).select("+password +refreshTokenHash");

  if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
    throw new AppError("Email, số điện thoại hoặc mật khẩu không đúng.", 401, "INVALID_CREDENTIALS");
  }
  if (user.status !== "active") {
    throw new AppError("Tài khoản đã bị khóa.", 403, "ACCOUNT_BLOCKED");
  }
  if (user.role !== "customer") {
    throw new AppError("Vui lòng đăng nhập tài khoản quản trị tại trang Admin.", 403, "CUSTOMER_ONLY");
  }

  await startCustomerSession(user, response);
  response.json({ success: true, data: { user: publicUser(user) } });
}

export async function customerRegister(request: Request, response: Response): Promise<void> {
  const input = customerRegisterSchema.parse(request.body);
  try {
    const user = await UserModel.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      password: await bcrypt.hash(input.password, 12),
      role: "customer",
      status: "active",
    });
    const sessionUser = await UserModel.findById(user.id).select("+refreshTokenHash");
    if (!sessionUser) throw new AppError("Không thể tạo phiên đăng nhập.", 500, "SESSION_CREATION_FAILED");
    await startCustomerSession(sessionUser, response);
    response.status(201).json({ success: true, data: { user: publicUser(sessionUser) } });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const duplicatedField = error.keyPattern && "phone" in error.keyPattern ? "Số điện thoại" : "Email";
      throw new AppError(`${duplicatedField} này đã được sử dụng.`, 409, "ACCOUNT_ALREADY_EXISTS");
    }
    throw error;
  }
}

export async function refresh(request: Request, response: Response): Promise<void> {
  const token = request.cookies?.refreshToken as string | undefined;
  if (!token) {
    throw new AppError("Không tìm thấy phiên đăng nhập.", 401, "NO_REFRESH_TOKEN");
  }

  const payload = verifyRefreshToken(token);
  const user = await UserModel.findOne({ _id: payload.sub, deletedAt: null }).select(
    "+refreshTokenHash",
  );
  if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
    throw new AppError("Phiên đăng nhập không hợp lệ.", 401, "INVALID_SESSION");
  }
  if (user.status !== "active" || user.role !== "admin") {
    throw new AppError("Tài khoản không thể truy cập trang quản trị.", 403, "ADMIN_ONLY");
  }

  const accessToken = createAccessToken(user.id, user.role);
  const refreshToken = createRefreshToken(user.id, user.role);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  setAuthCookies(response, accessToken, refreshToken);
  response.json({ success: true, data: { user: publicUser(user) } });
}

export async function customerRefresh(request: Request, response: Response): Promise<void> {
  const token = request.cookies?.customerRefreshToken as string | undefined;
  if (!token) {
    throw new AppError("Không tìm thấy phiên khách hàng.", 401, "NO_CUSTOMER_REFRESH_TOKEN");
  }

  const payload = verifyRefreshToken(token);
  const user = await UserModel.findOne({ _id: payload.sub, deletedAt: null }).select(
    "+refreshTokenHash",
  );
  if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
    throw new AppError("Phiên khách hàng không hợp lệ.", 401, "INVALID_CUSTOMER_SESSION");
  }
  if (user.status !== "active" || user.role !== "customer") {
    throw new AppError("Tài khoản khách hàng không thể truy cập.", 403, "CUSTOMER_ONLY");
  }

  await startCustomerSession(user, response);
  response.json({ success: true, data: { user: publicUser(user) } });
}

export async function logout(request: Request, response: Response): Promise<void> {
  const token = request.cookies?.refreshToken as string | undefined;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await UserModel.findByIdAndUpdate(payload.sub, { $unset: { refreshTokenHash: 1 } });
    } catch {
      // An invalid cookie should not prevent the user from logging out locally.
    }
  }
  clearAuthCookies(response);
  response.json({ success: true, data: null });
}

export async function customerLogout(request: Request, response: Response): Promise<void> {
  const token = request.cookies?.customerRefreshToken as string | undefined;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await UserModel.findOneAndUpdate(
        { _id: payload.sub, role: "customer" },
        { $unset: { refreshTokenHash: 1 } },
      );
    } catch {
      // An invalid customer cookie should not prevent local logout.
    }
  }
  clearCustomerAuthCookies(response);
  response.json({ success: true, data: null });
}

export async function me(request: Request, response: Response): Promise<void> {
  const user = await UserModel.findOne({ _id: request.auth?.userId, deletedAt: null });
  if (!user || user.status !== "active") {
    throw new AppError("Không tìm thấy tài khoản đang đăng nhập.", 401, "USER_NOT_FOUND");
  }
  response.json({ success: true, data: { user: publicUser(user) } });
}
