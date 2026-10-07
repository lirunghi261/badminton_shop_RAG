import { z } from "zod";
import { vietnamPhoneSchema } from "../../utils/phone.js";

export const loginSchema = z.object({
  email: z.email("Email không hợp lệ.").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
});

export const customerLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Vui lòng nhập email hoặc số điện thoại."),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
});

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự.").max(100),
  email: z.email("Email không hợp lệ.").transform((value) => value.toLowerCase()),
  phone: vietnamPhoneSchema,
  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
    .max(128)
    .regex(/[A-Za-z]/, "Mật khẩu phải có ít nhất một chữ cái.")
    .regex(/\d/, "Mật khẩu phải có ít nhất một chữ số."),
});

