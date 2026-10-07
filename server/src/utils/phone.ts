import { z } from "zod";

const vietnamPhonePattern = /^0[35789]\d{8}$/;

export function normalizeVietnamPhone(value: string): string {
  const compact = value.trim().replace(/[\s.\-()]/g, "");
  if (compact.startsWith("+84")) return `0${compact.slice(3)}`;
  if (compact.startsWith("84") && compact.length === 11) return `0${compact.slice(2)}`;
  return compact;
}

export const vietnamPhoneSchema = z.string().trim().transform((value, context) => {
  const normalized = normalizeVietnamPhone(value);
  if (!vietnamPhonePattern.test(normalized)) {
    context.addIssue({ code: "custom", message: "Số điện thoại Việt Nam không hợp lệ." });
    return z.NEVER;
  }
  return normalized;
});

export const optionalVietnamPhoneSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  vietnamPhoneSchema.optional(),
);

export const editableVietnamPhoneSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.union([vietnamPhoneSchema, z.null()]),
);
