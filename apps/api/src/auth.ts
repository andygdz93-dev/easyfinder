import type { FastifyRequest } from "fastify";

export type UserRole = "demo" | "buyer" | "seller" | "enterprise" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: UserRole | null;
  ndaAccepted?: boolean;
  ndaAcceptedAt?: Date | null;
};

export const getRoleFromRequest = (request: FastifyRequest) =>
  (request.user as AuthUser | undefined)?.role ?? "demo";
