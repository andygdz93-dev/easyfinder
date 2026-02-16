import "dotenv/config";

const ALLOW_PRODUCTION_FLAG = "--allow-production";
const LEGACY_ALLOW_PRODUCTION_FLAG = "--i-know-what-im-doing";

type ParsedArgs = {
  email: string;
  allowProduction: boolean;
};

const usage =
  "Usage: pnpm --filter @easyfinderai/api promote-admin -- --email you@example.com [--allow-production]";

const parseArgs = (argv: string[]): ParsedArgs => {
  let email = "";
  let allowProduction = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") continue;

    if (arg === "--email") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for --email.\n${usage}`);
      }
      email = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--email=")) {
      email = arg.slice("--email=".length);
      continue;
    }

    if (arg === ALLOW_PRODUCTION_FLAG || arg === LEGACY_ALLOW_PRODUCTION_FLAG) {
      allowProduction = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}\n${usage}`);
  }

  if (!email) {
    throw new Error(`--email is required.\n${usage}`);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    throw new Error(`Invalid email: ${email}`);
  }

  return { email: normalizedEmail, allowProduction };
};

const main = async () => {
  const { email, allowProduction } = parseArgs(process.argv.slice(2));

  if (process.env.NODE_ENV === "production" && !allowProduction) {
    throw new Error(
      `Refusing to run in production without ${ALLOW_PRODUCTION_FLAG}.\n` +
        `If you intentionally need this, run again with ${ALLOW_PRODUCTION_FLAG}.`
    );
  }

  const db = await import("../src/db.js");
  const usersModule = await import("../src/users.js");

  await db.connectToDatabase();

  try {
    const users = usersModule.getUsersCollection();
    console.log(`Email searched: ${email}`);

    const user = await users.findOne({ emailLower: email });
    if (!user) {
      console.error("Status: ERROR");
      console.error(`Reason: user not found for email ${email}`);
      process.exitCode = 1;
      return;
    }

    const userId = user._id.toHexString();
    const previousRole = user.role ?? "null";

    if (user.role === "admin") {
      console.log(`User id: ${userId}`);
      console.log(`Role transition: ${previousRole} -> admin`);
      console.log("Status: NOOP");
      return;
    }

    const updatedAt = new Date();
    const result = await users.updateOne(
      { _id: user._id },
      {
        $set: {
          role: "admin",
          roleSetAt: updatedAt,
          updatedAt,
        },
      }
    );

    if (result.matchedCount !== 1) {
      console.error("Status: ERROR");
      console.error(`Reason: expected to match 1 user, matched=${result.matchedCount}`);
      process.exitCode = 1;
      return;
    }

    console.log(`User id: ${userId}`);
    console.log(`Role transition: ${previousRole} -> admin`);
    console.log("Status: DONE");
  } finally {
    await db.closeDatabaseConnection();
  }
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
