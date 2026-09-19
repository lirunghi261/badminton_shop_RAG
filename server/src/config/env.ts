import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.url().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must contain at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must contain at least 32 characters"),
  ADMIN_NAME: z.string().min(2).default("System Administrator"),
  ADMIN_EMAIL: z.email().default("admin@badminton.local"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

