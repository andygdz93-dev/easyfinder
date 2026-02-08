import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url) });

// ✅ Import the rest AFTER dotenv is loaded
const { buildServer } = await import("./server.js");
const { config } = await import("./config.js");
const { connectToDatabase } = await import("./db.js");

await connectToDatabase();

const app = await buildServer();
const host = "0.0.0.0";
const port = Number(process.env.PORT ?? config.port ?? 8080);

app.log.info({ host, port }, "Starting EasyFinder API");

app.listen({ port, host }).catch((err: unknown) => {
  app.log.error(err);
  process.exit(1);
});
