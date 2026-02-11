import { z } from "zod";

/**
 * EasyFinder API environment validation (Zod)
 * - Fails fast with readable errors
 * - No "dev-secret in prod" footguns
 */

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

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

    // Stripe (optional unless production)
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_ID_PRO: z.string().min(1).optional(),
    STRIPE_PRICE_ID_ENTERPRISE: z.string().min(1).optional(),

    // Email (Resend)
    RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

    // Frontend base URL (for reset links)
    APP_BASE_URL: z.string().min(1, "APP_BASE_URL is required"),
  })
  .superRefine((values, ctx) => {
    if (values.NODE_ENV !== "production") return;

    const requiredStripeKeys = [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_ID_PRO",
      "STRIPE_PRICE_ID_ENTERPRISE",
    ] as const;

    for (const key of requiredStripeKeys) {
      if (!values[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required in production`,
        });
      }
    }
  });

const testDefaults =
  process.env.NODE_ENV === "test"
    ? {
        JWT_SECRET: "test-secret-1234567890",
        MONGO_URL: "mongodb://localhost:27017",
        DB_NAME: "easyfinder_test",
        RESEND_API_KEY: "test_key",
        APP_BASE_URL: "http://localhost:5173",
      }
    : {};

const parsed = EnvSchema.safeParse({ ...process.env, ...testDefaults });

if (!parsed.success) {
  throw new Error(
    "❌ Invalid environment variables:\n" +
      parsed.error.issues
        .map((i) => `- ${i.path.join(".")}: ${i.message}`)
        .join("\n")
  );
}

export const env = parsed.data;
