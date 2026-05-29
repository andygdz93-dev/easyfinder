/**
 * CSV Import Ingestion
 *
 * Accepts a CSV file path and imports listings into MongoDB.
 *
 * Expected CSV columns (header row required):
 *   title, price, hours, year, state, category, source_url, seller_type, description
 *
 * Optional columns:
 *   city, condition, shipping_available, has_inspection_report, has_service_history, verified_seller, image_url
 *
 * Usage:
 *   tsx src/scripts/ingest-csv.ts /path/to/listings.csv
 */

import fs from "fs";
import { parse } from "csv-parse/sync";
import { nanoid } from "nanoid";
import { getCollection } from "../../db.js";

const VALID_CATEGORIES = [
  "Excavator", "Loader", "Dozer", "Backhoe", "Telehandler",
  "Crane", "Grader", "Compactor", "Scraper", "Dump Truck",
  "Forklift", "Lift", "Skid Steer", "other"
];

const VALID_SELLER_TYPES = ["dealer", "auction", "private", "unknown"];

const FALLBACK_IMAGE = "/demo-images/excavator-1.jpg";

type RawRow = Record<string, string>;

const parseNum = (val: string | undefined): number | null => {
  if (!val || val.trim() === "") return null;
  const n = Number(val.replace(/[,$]/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

const parseBool = (val: string | undefined): boolean => {
  if (!val) return false;
  return ["true", "yes", "1", "y"].includes(val.trim().toLowerCase());
};

const normalizeCategory = (val: string): string => {
  const trimmed = val.trim();
  const match = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  return match ?? "other";
};

const normalizeSellerType = (val: string): string => {
  const trimmed = val.trim().toLowerCase();
  return VALID_SELLER_TYPES.includes(trimmed) ? trimmed : "unknown";
};

const rowToListing = (row: RawRow, now: string) => {
  const title = row["title"]?.trim();
  if (!title) throw new Error("Missing required field: title");

  const category = normalizeCategory(row["category"] ?? "other");
  const sellerType = normalizeSellerType(row["seller_type"] ?? "unknown");
  const sourceUrl = row["source_url"]?.trim() ?? "";
  const source = sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, "") : "csv-import";
  const sourceExternalId = sourceUrl || `csv-${nanoid(10)}`;

  const imageUrl = row["image_url"]?.trim() || FALLBACK_IMAGE;
  const images = [imageUrl, imageUrl, imageUrl, imageUrl, imageUrl];

  return {
    id: `csv:${nanoid(10)}`,
    title,
    description: row["description"]?.trim() ?? "",
    state: row["state"]?.trim().toUpperCase() ?? "",
    city: row["city"]?.trim() ?? "",
    price: parseNum(row["price"]),
    hours: parseNum(row["hours"]),
    year: parseNum(row["year"]) ?? undefined,
    condition: parseNum(row["condition"]) ?? undefined,
    category,
    operable: true,
    is_operable: true,
    sellerType,
    availability: "in_stock" as const,
    shippingAvailable: parseBool(row["shipping_available"]),
    hasInspectionReport: parseBool(row["has_inspection_report"]),
    hasServiceHistory: parseBool(row["has_service_history"]),
    verifiedSeller: parseBool(row["verified_seller"]),
    photoCount: 1,
    imageUrl,
    images,
    source,
    sourceExternalId,
    sourceUrl,
    status: "active",
    isPublished: true,
    lastSeenAt: now,
    listingUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  };
};

export interface CsvImportResult {
  total: number;
  upserted: number;
  modified: number;
  skipped: number;
  errors: string[];
}

export async function runCsvImportIngestion(filePath: string): Promise<CsvImportResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const rows: RawRow[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const listingsCol = getCollection("listings");
  const now = new Date().toISOString();

  let upserted = 0;
  let modified = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const listing = rowToListing(row, now);
      const { createdAt, isPublished, status, ...setFields } = listing;
      const result = await listingsCol.updateOne(
        { sourceExternalId: listing.sourceExternalId, source: listing.source },
        {
          $set: { ...setFields, updatedAt: now },
          $setOnInsert: { createdAt, isPublished, status },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) upserted++;
      else if (result.modifiedCount > 0) modified++;
      else skipped++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Row ${i + 2}: ${msg}`);
    }
  }

  return { total: rows.length, upserted, modified, skipped, errors };
}
