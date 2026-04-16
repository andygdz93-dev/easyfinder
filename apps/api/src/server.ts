import "dotenv/config";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import cors        from "@fastify/cors";
import helmet      from "@fastify/helmet";
import jwt         from "@fastify/jwt";
import rateLimit   from "@fastify/rate-limit";
import multipart   from "@fastify/multipart";
import rawBody from "fastify-raw-body";
import { nanoid }  from "nanoid";
import { ZodError } from "zod";

import { config }             from "./config.js";
import { getRoleFromRequest } from "./auth.js";
import brokerRoutes from "./routes/broker.js";

import listingRoutes  from "./routes/listings.js";
import scoringRoutes  from "./routes/scoring.js";
import watchlistRoutes from "./routes/watchlist.js";
import healthRoutes   from "./routes/health.js";
import billingRoutes from "./routes/billing.js";
import authRoutes     from "./routes/auth.js";
import adminRoutes    from "./routes/admin.js";
import intelligenceRoutes from "./routes/intelligence.js";
import sellerRoutes   from "./routes/seller.js";
import { dealRoutes } from "./routes/deal.js";
// import meRoutes        from "./routes/me.js";
// import ndaRoutes       from "./routes/nda.js";
// import inquiriesRoutes from "./routes/inquiries.js";
// import offersRoutes    from "./routes/offers.js";

// import imageRoutes     from "./routes/images.js";

declare module "fastify" {
  interface FastifyRequest  { requestId: string; }
  interface FastifyInstance { authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>; }
}

export const buildServer = () => {
   const app = Fastify({ logger: true })

  if (config.demoMode) {
    app.log.warn("DEMO_MODE enabled — serving seeded inventory");
  
  
  }

  app.decorateRequest("requestId", "");

  // CORS
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed"), false);
    },
    credentials: true,
  });

  // Security headers
  app.register(helmet);

  // JWT
  app.register(jwt, { secret: config.jwtSecret });

  // Auth decorator
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Authentication required.", requestId: request.requestId },
      });
    }
  });

  // Rate limiting — tiered by role
  app.register(rateLimit, {
    timeWindow: "1 minute",
    max: (request: FastifyRequest) => {
      const role = getRoleFromRequest(request as any);
      if (role === "admin")  return 600;
      if (role === "seller") return 240;
      if (role === "buyer")  return 120;
      return 30;
    },
  });

  // File uploads — 5MB cap
  app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });
// Stripe webhook raw body
app.register(rawBody, {
  field: "rawBody",
  global: false,
  encoding: "utf8",
  runFirst: true,
});


  // Request ID + optional auth on every request
  app.addHook("onRequest", async (request, reply) => {
    const requestId = nanoid();
    request.requestId = requestId;
    reply.header("x-request-id", requestId);

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try { await request.jwtVerify(); } catch { /* optional, ignore */ }
    }
  });

  // Central error handler
  app.setErrorHandler((error: any, request, reply) => {
    request.log.error(error);
    const isZod    = error instanceof ZodError;
    const status   = error.statusCode ?? (isZod ? 400 : 500);
    const code     = isZod ? "BAD_REQUEST" : (error.code ?? "SERVER_ERROR");
    const message  = isZod ? "Invalid request." : (error.message ?? "Unexpected error");
    reply.status(status).send({ error: { code, message }, requestId: request.requestId });
  });

  // Routes
  app.register(healthRoutes,   { prefix: "/api/health" });
  app.register(authRoutes,     { prefix: "/api/auth" });
  app.register(listingRoutes,  { prefix: "/api/listings" });
  app.register(brokerRoutes, { prefix: "/api/broker" });
  app.register(scoringRoutes,  { prefix: "/api/scoring-configs" });
  app.register(watchlistRoutes,{ prefix: "/api/watchlist" });
  app.register(billingRoutes, { prefix: "/api/billing" });
  app.register(adminRoutes,    { prefix: "/api/admin" });
  app.register(intelligenceRoutes, { prefix: "/api/intelligence" });
  app.register(sellerRoutes,   { prefix: "/api/seller" });
  app.register(dealRoutes,     { prefix: "/api" });
  // app.register(meRoutes,         { prefix: "/api/me" });
  // app.register(ndaRoutes,        { prefix: "/api/nda" });
  // app.register(inquiriesRoutes,  { prefix: "/api/inquiries" });
  // app.register(offersRoutes,     { prefix: "/api/offers" });
;
  // app.register(imageRoutes,      { prefix: "/api/images" });
  
  return app;

  
};

const start = async () => {
  try {
    console.log("BOOT: starting server...");

    const app = buildServer();

    console.log("BOOT: server built");

    await app.listen({
      port: 8080,
      host: "0.0.0.0",
    });

    console.log("✅ SERVER LISTENING ON 8080");

  } catch (err) {
    console.error("❌ START FAILED:", err);
    process.exit(1);
  }
};

start();
