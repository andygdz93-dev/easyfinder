import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { extname } from "node:path";
import { requireNDA } from "../middleware/requireNDA.js";
import { requirePlan } from "../middleware/requirePlan.js";
import { disableWritesInDemo } from "../middleware/disableWritesInDemo.js";
import { fail, ok } from "../response.js";
import { getUploadsBucket } from "../db.ts";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export default async function uploadsRoutes(app: FastifyInstance) {
  app.post(
    "/images",
    {
      preHandler: [app.authenticate, requireNDA, requirePlan(["pro", "enterprise"]), disableWritesInDemo],
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return fail(request, reply, "UNAUTHORIZED", "Authentication required.", 401);
      }

      const part = await request.file();
      if (!part) {
        return fail(request, reply, "BAD_REQUEST", "Missing file field named 'file'.", 400);
      }

      const filename = part.filename ?? "";
      const extension = extname(filename).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        return fail(request, reply, "BAD_REQUEST", "Unsupported image extension.", 400);
      }

      const contentType = part.mimetype ?? "";
      if (!contentType.toLowerCase().startsWith("image/")) {
        return fail(request, reply, "BAD_REQUEST", "Only image uploads are allowed.", 400);
      }

      const uploadBuffer = await part.toBuffer();
      if (uploadBuffer.length > MAX_IMAGE_BYTES) {
        return fail(request, reply, "BAD_REQUEST", "Image file exceeds 5MB limit.", 400);
      }

      const bucket = getUploadsBucket();
      const fileId = await new Promise<ObjectId>((resolve, reject) => {
        const stream = bucket.openUploadStream(filename || "upload", {
          metadata: {
            ownerUserId: userId,
            uploadedAt: new Date().toISOString(),
            originalName: filename,
            contentType,
          },
          contentType,
        });

        stream.on("error", reject);
        stream.on("finish", () => resolve(stream.id as ObjectId));
        stream.end(uploadBuffer);
      });

      return ok(request, {
        id: fileId.toHexString(),
        url: `/api/uploads/images/${fileId.toHexString()}`,
      });
    }
  );

  app.get("/images/:id", async (request, reply) => {
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    reply.header("Access-Control-Allow-Origin", "*");

    const { id } = request.params as { id: string };
    if (!ObjectId.isValid(id)) {
      return fail(request, reply, "BAD_REQUEST", "Invalid upload id.", 400);
    }

    const objectId = new ObjectId(id);
    const bucket = getUploadsBucket();
    const fileDoc = await bucket.find({ _id: objectId }).next();
    if (!fileDoc) {
      return fail(request, reply, "NOT_FOUND", "Image not found.", 404);
    }

    const metadataType = typeof fileDoc.metadata?.contentType === "string" ? fileDoc.metadata.contentType : undefined;
    reply.header("Cache-Control", "public, max-age=3600");
    reply.type(metadataType || fileDoc.contentType || "application/octet-stream");

    const downloadStream = bucket.openDownloadStream(objectId);
    downloadStream.on("error", () => {
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

    return reply.send(downloadStream);
  });
}
