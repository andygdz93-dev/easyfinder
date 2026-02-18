import { GridFSBucket, ObjectId } from "mongodb";
import { getDb } from "./db.js";

let imagesBucket: GridFSBucket | null = null;

const getImagesBucket = () => {
  if (!imagesBucket) {
    imagesBucket = new GridFSBucket(getDb(), { bucketName: "images" });
  }

  return imagesBucket;
};

export const uploadImageToGridFs = async ({
  buffer,
  filename,
  contentType,
  metadata,
}: {
  buffer: Buffer;
  filename: string;
  contentType: string;
  metadata?: Record<string, unknown>;
}) => {
  const bucket = getImagesBucket();

  return new Promise<ObjectId>((resolve, reject) => {
    const stream = bucket.openUploadStream(filename || "image", {
      contentType,
      metadata,
    });

    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id as ObjectId));
    stream.end(buffer);
  });
};

export const getImageFileFromGridFs = async (id: ObjectId) => {
  const bucket = getImagesBucket();
  return bucket.find({ _id: id }).next();
};

export const openImageDownloadStreamFromGridFs = (id: ObjectId) => {
  const bucket = getImagesBucket();
  return bucket.openDownloadStream(id);
};

