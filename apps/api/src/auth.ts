import type { FastifyRequest } from "fastify";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "demo" | "buyer" | "seller" | "admin";
};

export const getRoleFromRequest = (request: FastifyRequest) =>
  (request.user as AuthUser | undefined)?.role ?? "demo";
