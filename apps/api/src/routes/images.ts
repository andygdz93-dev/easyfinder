import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { fail } from "../response.js";
import { getImageFileFromGridFs, openImageDownloadStreamFromGridFs } from "../gridfs-images.js";

export default async function imageRoutes(app: FastifyInstance) {
  app.get("/images/:id", async (request, reply) => {
    // Images are rendered by the Vercel-hosted frontend on a different origin.
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    reply.header("Access-Control-Allow-Origin", "*");

    const { id } = request.params as { id: string };
    if (!ObjectId.isValid(id)) {
      return fail(request, reply, "NOT_FOUND", "Image not found.", 404);
    }

    const objectId = new ObjectId(id);
    const file = await getImageFileFromGridFs(objectId);
    if (!file) {
      return fail(request, reply, "NOT_FOUND", "Image not found.", 404);
    }

    const metadataType = typeof file.metadata?.contentType === "string" ? file.metadata.contentType : undefined;
    reply.type(metadataType || file.contentType || "application/octet-stream");

    const stream = openImageDownloadStreamFromGridFs(objectId);
    stream.on("error", () => {
      if (!reply.raw.headersSent) {
        reply.code(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Image not found.",
            requestId: request.requestId,
          },
        });
      }
    });

    return reply.send(stream);
  });
}
