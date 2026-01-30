import dotenv from "dotenv";

// ✅ Always load apps/api/.env first
dotenv.config({ path: new URL("../.env", import.meta.url) });

// TEMP: confirm it loaded (remove after success)
console.log("Loaded ENV:", {
  DEMO_MODE: process.env.DEMO_MODE,
  JWT_SECRET: !!process.env.JWT_SECRET,
  MONGO_URL: !!process.env.MONGO_URL,
  DB_NAME: process.env.DB_NAME,
});

// ✅ Import the rest AFTER dotenv is loaded
const { buildServer } = await import("./server.js");
const { config } = await import("./config.js");

const app = await buildServer();

app.listen({ port: config.port, host: "0.0.0.0" }).catch((err: unknown) => {
  app.log.error(err);
  process.exit(1);
});
