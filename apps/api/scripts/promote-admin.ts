import "dotenv/config";
import { MongoClient } from "mongodb";

const PROD_BYPASS_FLAG = "--i-know-what-im-doing";

type ParsedArgs = {
  email: string;
  bypassProdGuard: boolean;
};

const usage =
  "Usage: pnpm --filter @easyfinderai/api promote-admin -- --email you@example.com [--i-know-what-im-doing]";

const parseArgs = (argv: string[]): ParsedArgs => {
  let email = "";
  let bypassProdGuard = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      continue;
    }

    if (arg === "--email") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --email.\n" + usage);
      }
      email = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--email=")) {
      email = arg.slice("--email=".length);
      continue;
    }

    if (arg === PROD_BYPASS_FLAG) {
      bypassProdGuard = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}\n${usage}`);
  }

  if (!email) {
    throw new Error("--email is required.\n" + usage);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    throw new Error(`Invalid email: ${email}`);
  }

  return { email: normalizedEmail, bypassProdGuard };
};

const requireMongoConfig = () => {
  const { MONGO_URL, DB_NAME } = process.env;
  if (!MONGO_URL || !DB_NAME) {
    throw new Error("MONGO_URL and DB_NAME must be set in environment variables.");
  }
  return { MONGO_URL, DB_NAME };
};

const main = async () => {
  const { email, bypassProdGuard } = parseArgs(process.argv.slice(2));
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (nodeEnv === "production" && !bypassProdGuard) {
    throw new Error(
      `Refusing to run in production without ${PROD_BYPASS_FLAG}.` +
        `\nRe-run with ${PROD_BYPASS_FLAG} only if you understand the risk.`
    );
  }

  const { MONGO_URL, DB_NAME } = requireMongoConfig();

  const client = new MongoClient(MONGO_URL);
  await client.connect();

  try {
    const users = client.db(DB_NAME).collection("users");

    const existingUser = await users.findOne<{ role?: string | null; email?: string; emailLower?: string }>(
      { emailLower: email },
      { projection: { role: 1, email: 1, emailLower: 1 } }
    );

    if (!existingUser) {
      console.log(`No changes: user ${email} not found.`);
      process.exitCode = 1;
      return;
    }

    const previousRole = existingUser.role ?? null;
    const now = new Date();

    const result = await users.updateOne(
      { emailLower: email },
      { $set: { role: "admin", roleSetAt: now, updatedAt: now } }
    );

    const resolvedEmail = existingUser.email ?? existingUser.emailLower ?? email;

    if (result.modifiedCount === 0 && previousRole === "admin") {
      console.log(
        `No changes: ${resolvedEmail} already had role admin (matched=${result.matchedCount}, modified=${result.modifiedCount}).`
      );
      return;
    }

    console.log(
      `Changed user ${resolvedEmail}: role ${String(previousRole)} -> admin (matched=${result.matchedCount}, modified=${result.modifiedCount}).`
    );
  } finally {
    await client.close();
  }
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
