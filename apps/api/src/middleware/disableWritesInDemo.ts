import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

export async function disableWritesInDemo(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Tests need explicit opt-in for write access to validate upload and mutation flows.
  if (
    process.env.NODE_ENV === "test" &&
    process.env.ALLOW_DEMO_WRITES_IN_TESTS === "true"
  ) {
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
