import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Response } from "express";
import { env } from "../../config/env.js";
import type { UserRole } from "../users/user.model.js";
import { AppError } from "../../utils/AppError.js";

interface AuthTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
}

const isProduction = env.NODE_ENV === "production";
const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export function createAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ role }, env.JWT_ACCESS_SECRET, { subject: userId, expiresIn: "15m" });
}

export function createRefreshToken(userId: string, role: UserRole): string {
  return jwt.sign({ role }, env.JWT_REFRESH_SECRET, { subject: userId, expiresIn: "7d" });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;
  } catch {
    throw new AppError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", 401, "INVALID_ACCESS_TOKEN");
  }
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthTokenPayload;
  } catch {
    throw new AppError("Phiên đăng nhập đã hết hạn.", 401, "INVALID_REFRESH_TOKEN");
  }
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function setAuthCookies(response: Response, accessToken: string, refreshToken: string): void {
  response.cookie("accessToken", accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });
  response.cookie("refreshToken", refreshToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie("accessToken", baseCookieOptions);
  response.clearCookie("refreshToken", baseCookieOptions);
}

