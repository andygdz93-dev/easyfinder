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

  // Security / Auth (required)
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters (use a long random string)"),

  // CORS (comma-separated list of origins)
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .refine((arr) => arr.length > 0, "CORS_ORIGINS must contain at least one origin"),

  // Mongo (required)
  MONGO_URL: z.string().min(1, "MONGO_URL is required"),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
});

function formatZodError(err: z.ZodError) {
  return err.issues
    .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

export function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`❌ Invalid environment variables:\n${formatZodError(parsed.error)}`);
  }
  return parsed.data;
}

// Singleton: validated once, used everywhere
export const env = loadEnv();
