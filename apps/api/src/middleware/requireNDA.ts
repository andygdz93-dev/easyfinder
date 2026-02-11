import { FastifyReply, FastifyRequest } from "fastify";

export async function requireNDA(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as any;

  if (!user?.ndaAccepted) {
    return reply.status(403).send({
      error: {
        code: "NDA_REQUIRED",
        message: "NDA must be accepted before accessing this resource.",
      },
    });
  }
}
