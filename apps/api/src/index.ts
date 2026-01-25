import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url) });
console.log("Loaded ENV:", {
  DEMO_MODE: process.env.DEMO_MODE,
  JWT_SECRET: !!process.env.JWT_SECRET,
  MONGO_URL: !!process.env.MONGO_URL,
  DB_NAME: process.env.DB_NAME,
});


import { buildServer } from "./server.js";
import { config } from "./config.js";

const app = await buildServer();

app.listen({ port: config.port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
