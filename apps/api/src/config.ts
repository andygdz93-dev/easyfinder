import { z } from "zod";

const env = {
  NODE_ENV:           process.env.NODE_ENV || "development",
  PORT:               parseInt(process.env.PORT || "8080", 10),
  DATABASE_URL:       process.env.DATABASE_URL || "postgresql://postgres@localhost/easyfinder",
  JWT_SECRET:         process.env.JWT_SECRET || "dev-secret-key",
  CORS_ORIGINS:       (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173").split(","),
  DEMO_MODE:          process.env.DEMO_MODE === "true",
  ANTHROPIC_API_KEY:  process.env.ANTHROPIC_API_KEY,
  STRIPE_SECRET_KEY:  process.env.STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID:    process.env.STRIPE_PRICE_ID,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID_PRO:        process.env.STRIPE_PRICE_ID_PRO,
  STRIPE_PRICE_ID_ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE,
  RESEND_API_KEY:             process.env.RESEND_API_KEY,
  RESEND_FROM:                process.env.RESEND_FROM,
  APP_BASE_URL:               process.env.APP_BASE_URL,
  LAUNCH_DATE:                process.env.LAUNCH_DATE,
  ADMIN_ENABLED:              process.env.ADMIN_ENABLED === 'true',
  ADMIN_EMAIL_ALLOWLIST:      (process.env.ADMIN_EMAIL_ALLOWLIST || '').split(',').filter(Boolean),
  BILLING_ENABLED:            process.env.BILLING_ENABLED === 'true',
  BILLING_STUB_PLAN:          process.env.BILLING_STUB_PLAN,
  CLIENT_URL:         process.env.CLIENT_URL || "http://localhost:5173",
};

const dbUrl = new URL(env.DATABASE_URL);

export const config = {
  nodeEnv:   env.NODE_ENV,
  port:      env.PORT,
  demoMode:  env.DEMO_MODE,
  db: {
    url:      env.DATABASE_URL,
    host:     dbUrl.hostname,
    user:     dbUrl.username || "postgres",
    password: dbUrl.password || "",
    port:     parseInt(dbUrl.port || "5432", 10),
    name:     dbUrl.pathname.slice(1) || "easyfinder",
  },
  jwtSecret:   env.JWT_SECRET,
  corsOrigins: env.CORS_ORIGINS,
  stripe: {
    secretKey:      env.STRIPE_SECRET_KEY,
    priceId:        env.STRIPE_PRICE_ID,
    webhookSecret:  env.STRIPE_WEBHOOK_SECRET,
    clientUrl:      env.CLIENT_URL,
  },
};
