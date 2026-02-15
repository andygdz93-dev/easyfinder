import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

export async function disableWritesInDemo(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Tests need write access to validate upload and mutation flows end-to-end.
  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (env.DEMO_MODE) {
    return reply.status(403).send({
      error: {
        code: "DEMO_WRITE_DISABLED",
        message: "Creating or modifying data is disabled in demo mode.",
        requestId: request.requestId,
      },
    });
  }
}
