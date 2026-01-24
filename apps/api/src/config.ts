import dotenv from "dotenv";
dotenv.config();

const requireEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const config = {
  jwtSecret: requireEnv("JWT_SECRET", "dev-secret"),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  mongoUrl: requireEnv("MONGO_URL"),
  dbName: requireEnv("DB_NAME"),
};
