import { ObjectId } from "mongodb";
import { closeDatabaseConnection, connectToDatabase } from "../db.js";
import { env } from "../env.js";
import { getListingsCollection, type ListingDocument } from "../listings.js";

type SeedArgs = {
  sellerId?: string;
  count: number;
  dryRun: boolean;
  allowProduction: boolean;
};

const USAGE =
  "Usage: pnpm --filter @easyfinderai/api seed-seller-listings -- --seller-id <id> [--count N] [--dry-run|--no-dry-run] [--allow-production]";

const TITLES = ["Caterpillar 320", "John Deere 544", "Komatsu PC210", "Volvo L90", "Case 580 Super N"];
const LOCATIONS = ["Austin, TX", "Sacramento, CA", "Miami, FL", "Charlotte, NC", "Boise, ID"];
const MAKES = ["Caterpillar", "John Deere", "Komatsu", "Volvo", "Case"];
const MODELS = ["320", "544", "PC210", "L90", "580 Super N"];
const CATEGORIES = ["Excavator", "Loader", "Backhoe", "Dozer", "Lift"];

const parseArgs = (argv: string[]): SeedArgs => {
  const args: SeedArgs = {
    sellerId: undefined,
    count: 25,
    dryRun: true,
    allowProduction: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--seller-id") {
      const next = argv[i + 1];
      if (!next) throw new Error(`Missing value for --seller-id. ${USAGE}`);
      args.sellerId = next;
      i += 1;
      continue;
    }

    if (arg === "--count") {
      const next = argv[i + 1];
      if (!next) throw new Error(`Missing value for --count. ${USAGE}`);
      const parsed = Number(next);
      if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Invalid --count value: ${next}. ${USAGE}`);
      args.count = parsed;
      i += 1;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--no-dry-run") {
      args.dryRun = false;
      continue;
    }

    if (arg === "--allow-production") {
      args.allowProduction = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}. ${USAGE}`);
  }

  if (!args.sellerId) throw new Error(`--seller-id is required. ${USAGE}`);
  return args;
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildListing = (sellerId: string, index: number): ListingDocument => {
  const seedIndex = index % TITLES.length;
  const now = new Date().toISOString();
  const images = [
    `https://placehold.co/800x600?text=Seller+${sellerId}+${index + 1}`,
    `https://placehold.co/800x600?text=Unit+${index + 1}+A`,
  ];

  return {
    id: new ObjectId().toHexString(),
    title: `${TITLES[seedIndex]} #${index + 1}`,
    description: `Mock listing ${index + 1} generated for seller ${sellerId}.` ,
    state: LOCATIONS[seedIndex],
    price: randomInt(45000, 295000),
    hours: randomInt(120, 9800),
    operable: true,
    is_operable: true,
    year: randomInt(2003, 2025),
    condition: randomInt(0, 3),
    category: CATEGORIES[seedIndex],
    imageUrl: images[0],
    images,
    source: `seller:${sellerId}`,
    sourceUrl: "",
    status: "active",
    isPublished: true,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    make: MAKES[seedIndex],
    model: MODELS[seedIndex],
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (env.NODE_ENV === "production" && !args.allowProduction) {
    throw new Error("Refusing to run in production without --allow-production.");
  }

  const listings = Array.from({ length: args.count }, (_, index) => buildListing(args.sellerId as string, index));

  console.log(
    `Seeding seller listings | sellerId=${args.sellerId} | count=${args.count} | dryRun=${args.dryRun} | allowProduction=${args.allowProduction} | nodeEnv=${env.NODE_ENV}`
  );

  if (args.dryRun) {
    console.log(`processed=${listings.length} created=0`);
    return;
  }

  await connectToDatabase();
  await getListingsCollection().insertMany(listings);
  console.log(`processed=${listings.length} created=${listings.length}`);
};

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[seed-seller-listings] ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
  });
