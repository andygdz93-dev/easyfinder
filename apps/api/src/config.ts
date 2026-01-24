import { env } from "./env.js";

export const config = {
  port: env.PORT,
  jwtSecret: env.JWT_SECRET,
  corsOrigins: env.CORS_ORIGINS,
  mongoUrl: env.MONGO_URL,
  dbName: env.DB_NAME,
};
