import { basename, extname } from "node:path";
import { inflateRawSync } from "node:zlib";

const IMAGE_NAME_PATTERN = /^(\d+)\s*(?:[-_]\s*)?([A-E])\s*\.(jpg|jpeg|png|webp)$/i;
const ZIP_SIGNATURES = {
  endOfCentralDir: 0x06054b50,
  centralFileHeader: 0x02014b50,
  localFileHeader: 0x04034b50,
} as const;

type ZipEntry = { fileName: string; data: Buffer };

export type ZipBundleImage = {
  fileName: string;
  data: Buffer;
};

export type ParsedZipBundle = {
  csvText: string;
  imagesByKey: Map<string, ZipBundleImage>;
  invalidImageNames: string[];
};

const unzipBuffer = (zipBuffer: Buffer): ZipEntry[] => {
  let eocdOffset = -1;
  for (let cursor = zipBuffer.length - 22; cursor >= 0; cursor -= 1) {
    if (zipBuffer.readUInt32LE(cursor) === ZIP_SIGNATURES.endOfCentralDir) {
      eocdOffset = cursor;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("Invalid ZIP: end of central directory not found.");
  }

  const centralDirectoryOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const entries: ZipEntry[] = [];

  let centralOffset = centralDirectoryOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (zipBuffer.readUInt32LE(centralOffset) !== ZIP_SIGNATURES.centralFileHeader) {
      throw new Error("Invalid ZIP: malformed central directory entry.");
    }

    const compressionMethod = zipBuffer.readUInt16LE(centralOffset + 10);
    const compressedSize = zipBuffer.readUInt32LE(centralOffset + 20);
    const fileNameLength = zipBuffer.readUInt16LE(centralOffset + 28);
    const extraLength = zipBuffer.readUInt16LE(centralOffset + 30);
    const commentLength = zipBuffer.readUInt16LE(centralOffset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(centralOffset + 42);
    const fileName = zipBuffer.toString("utf8", centralOffset + 46, centralOffset + 46 + fileNameLength);

    centralOffset += 46 + fileNameLength + extraLength + commentLength;
    if (!fileName || fileName.endsWith("/")) continue;

    if (zipBuffer.readUInt32LE(localHeaderOffset) !== ZIP_SIGNATURES.localFileHeader) {
      throw new Error("Invalid ZIP: local file header missing.");
    }

    const localFileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const fileDataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const fileDataEnd = fileDataStart + compressedSize;
    const compressedData = zipBuffer.subarray(fileDataStart, fileDataEnd);

    let data: Buffer;
    if (compressionMethod === 0) {
      data = Buffer.from(compressedData);
    } else if (compressionMethod === 8) {
      data = inflateRawSync(compressedData);
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod}.`);
    }

    entries.push({ fileName, data });
  }

  return entries;
};

export const parseZipImageArchive = (zipBuffer: Buffer): { imagesByKey: Map<string, ZipBundleImage>; invalidImageNames: string[] } => {
  const entries = unzipBuffer(zipBuffer);
  const imagesByKey = new Map<string, ZipBundleImage>();
  const invalidImageNames: string[] = [];

  for (const entry of entries) {
    const extension = extname(entry.fileName).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
      continue;
    }

    const fileName = basename(entry.fileName).trim();
    const match = fileName.match(IMAGE_NAME_PATTERN);
    if (!match) {
      invalidImageNames.push(fileName);
      continue;
    }

    const row = Number.parseInt(match[1], 10);
    if (!Number.isFinite(row) || row < 2) {
      invalidImageNames.push(fileName);
      continue;
    }

    const key = `${row}${match[2].toUpperCase()}`;
    if (imagesByKey.has(key)) {
      throw new Error(`Duplicate image mapping found in ZIP for row-slot key '${key}'.`);
    }

    imagesByKey.set(key, { fileName, data: entry.data });
  }

  return { imagesByKey, invalidImageNames };
};

export const parseZipBundle = (zipBuffer: Buffer): ParsedZipBundle => {
  const entries = unzipBuffer(zipBuffer);
  const csvEntries = entries.filter((entry) => extname(entry.fileName).toLowerCase() === ".csv");

  if (csvEntries.length === 0) {
    throw new Error("ZIP bundle must contain exactly one CSV file (none found).");
  }
  if (csvEntries.length > 1) {
    throw new Error("ZIP bundle must contain exactly one CSV file (multiple found).");
  }

  const { imagesByKey, invalidImageNames } = parseZipImageArchive(zipBuffer);

  return {
    csvText: csvEntries[0].data.toString("utf8"),
    imagesByKey,
    invalidImageNames,
  };
};
