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

    // App base URL (used for building absolute links in emails)
    // Local: http://localhost:5173
    // Prod:  https://<your-vercel-domain>
    APP_BASE_URL: z.string().url().default("http://localhost:5173"),

    // Resend (for password reset emails, etc.)
    // Required to send real emails in production.
    RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required").optional(),
    // Must be a verified sender in Resend, e.g. "EasyFinder <no-reply@yourdomain.com>"
    RESEND_FROM: z.string().min(1, "RESEND_FROM is required").optional(),

    // Stripe (required in production)
    STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required").optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required").optional(),
    STRIPE_PRICE_ID_PRO: z.string().min(1, "STRIPE_PRICE_ID_PRO is required").optional(),
    STRIPE_PRICE_ID_ENTERPRISE: z
      .string()
      .min(1, "STRIPE_PRICE_ID_ENTERPRISE is required")
      .optional(),
  })
  .superRefine((values, ctx) => {
    if (values.NODE_ENV !== "production") return;

    // Stripe required in production (as you already wanted)
    const stripeRequired = [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_ID_PRO",
      "STRIPE_PRICE_ID_ENTERPRISE",
    ] as const;

    for (const key of stripeRequired) {
      if (!values[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required in production`,
        });
      }
    }

    // Resend required in production if you want real reset emails in prod
    const resendRequired = ["RESEND_API_KEY", "RESEND_FROM"] as const;
    for (const key of resendRequired) {
      if (!values[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required in production (needed for password reset emails)`,
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
        APP_BASE_URL: "http://localhost:5173",
      }
    : {};

const parsed = EnvSchema.safeParse({ ...process.env, ...testDefaults });

if (!parsed.success) {
  throw new Error(
    "❌ Invalid environment variables:\n" +
      parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n")
  );
}

export const env = parsed.data;
