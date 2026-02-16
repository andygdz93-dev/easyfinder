import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

const parseAllowlist = (value?: string) => {
  if (!value) return null;
  const normalized = value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return normalized.length ? new Set(normalized) : null;
};


export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!env.ADMIN_ENABLED) {
    return reply.status(404).send({
      error: {
        code: "ADMIN_DISABLED",
        message: "Admin endpoints are disabled.",
      },
      requestId: request.requestId,
    });
  }

  const user = request.user;

  if (!user || user.role !== "admin") {
    return reply.status(403).send({
      error: {
        code: "FORBIDDEN",
        message: "Admin access only.",
      },
      requestId: request.requestId,
    });
  }

  const adminEmailAllowlist = parseAllowlist(env.ADMIN_EMAIL_ALLOWLIST);
  const email = user.email?.toLowerCase().trim();
  if (adminEmailAllowlist && (!email || !adminEmailAllowlist.has(email))) {
    return reply.status(403).send({
      error: {
        code: "FORBIDDEN",
        message: "Admin email is not allowlisted.",
      },
      requestId: request.requestId,
    });
  }
}
