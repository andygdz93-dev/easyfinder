import { z } from "zod";

/**
 * EasyFinder API environment validation (Zod)
 * - Fails fast with readable errors
 * - No "dev-secret in prod" footguns
 */

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),

  // Backend runtime
  PORT: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 8080))
    .refine((n) => Number.isFinite(n) && n > 0 && n < 65536, "PORT must be a valid port"),

  // Demo Mode
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === "true"),


  // Security / Auth (required)
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters (use a long random string)"),

  // CORS (comma-separated list of origins)
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .refine((arr) => arr.length > 0),

  // Mongo (required)
  MONGO_URL: z.string().min(1, "MONGO_URL is required"),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(import { z } from "zod";

/**
 * EasyFinder API environment validation (Zod)
 * - Fails fast with readable errors
 * - No "dev-secret in prod" footguns
 */

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),

  // Backend runtime
  PORT: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 8080))
    .refine((n) => Number.isFinite(n) && n > 0 && n < 65536, "PORT must be a valid port"),

  // Demo Mode
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === "true"),


  // Security / Auth (required)
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters (use a long random string)"),

  // CORS (comma-separated list of origins)
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .refine((arr) => arr.length > 0),

  // Mongo (required)
  MONGO_URL: z.string().min(1, "MONGO_URL is required"),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    "❌ Invalid environment variables:\n" +
      parsed.error.issues
        .map((i) => `- ${i.path.join(".")}: ${i.message}`)
        .join("\n")
  );
}

export const env = parsed.data;
    "❌ Invalid environment variables:\n" +
      parsed.error.issues
        .map((i) => `- ${i.path.join(".")}: ${i.message}`)
        .join("\n")
  );
}

export const env = parsed.data;
