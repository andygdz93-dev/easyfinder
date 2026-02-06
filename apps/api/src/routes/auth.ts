import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";
import { fail, ok } from "../response.js";
import { env } from "../env.js";
import { users as demoUsers } from "../store.js";

type UserDocument = {
  _id: ObjectId;
  email: string;
  emailLower: string;
  name: string;
  role: "buyer" | "seller" | "admin";
  passwordHash: string;
  ndaAcceptedAt?: Date;
  ndaVersion?: string;
  createdAt: Date;
  updatedAt: Date;
};

const toUserDto = (user: UserDocument) => ({
  id: user._id.toHexString(),
  email: user.email,
  name: user.name,
  role: user.role,
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type UsersCollection = {
  findOne: (query: { emailLower?: string; _id?: ObjectId }) => Promise<UserDocument | null>;
  insertOne: (doc: UserDocument) => Promise<void>;
};

const testUsers = new Map<string, UserDocument>();
const seedTestUsers = () => {
  if (testUsers.size) return;
  demoUsers.forEach((user) => {
    if (!user.email) return;
    const now = new Date();
    const doc: UserDocument = {
      _id: new ObjectId(),
      email: user.email,
      emailLower: user.email.toLowerCase(),
      name: user.name ?? "Demo User",
      role: user.role === "demo" ? "buyer" : user.role ?? "buyer",
      passwordHash: user.passwordHash ?? "",
      createdAt: now,
      updatedAt: now,
    };
    testUsers.set(doc.emailLower, doc);
  });
};

const getUsersCollection = (): UsersCollection => {
  try {
    const collection = getCollection<UserDocument>("users");
    return {
      findOne: (query) => collection.findOne(query),
      insertOne: async (doc) => {
        await collection.insertOne(doc);
      },
    };
  } catch (error) {
    if (env.NODE_ENV !== "test") {
      throw error;
    }

    seedTestUsers();
    return {
      findOne: async (query) => {
        if (query.emailLower) {
          return testUsers.get(query.emailLower) ?? null;
        }
        if (query._id) {
          for (const user of testUsers.values()) {
            if (user._id.equals(query._id)) {
              return user;
            }
          }
        }
        return null;
      },
      insertOne: async (doc) => {
        testUsers.set(doc.emailLower, doc);
      },
    };
  }
};

export default async function authRoutes(app: FastifyInstance) {
  const usersCollection = () => getUsersCollection();

  app.post("/register", async (request, reply) => {
    const col = usersCollection();
    const payload = registerSchema.parse(request.body);
    const emailLower = payload.email.toLowerCase();
    const existing = await col.findOne({ emailLower });
    if (existing) {
      return fail(request, reply, "EMAIL_EXISTS", "Email already registered.", 400);
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const now = new Date();
    const userDocument: UserDocument = {
      _id: new ObjectId(),
      email: payload.email,
      emailLower,
      name: payload.name ?? "New User",
      role: "buyer",
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await col.insertOne(userDocument);
    } catch (error: any) {
      if (error?.code === 11000) {
        return fail(request, reply, "EMAIL_EXISTS", "Email already registered.", 400);
      }
      throw error;
    }

    const token = await reply.jwtSign({ id: userDocument._id.toHexString(), role: "buyer" });

    return ok(request, {
      token,
      user: toUserDto(userDocument),
    });
  });

  app.post("/login", async (request, reply) => {
    const col = usersCollection();
    const payload = loginSchema.parse(request.body);
    const emailLower = payload.email.toLowerCase();
    const user = await col.findOne({ emailLower });
    if (!user) {
      return fail(request, reply, "INVALID_CREDENTIALS", "Invalid credentials.", 401);
    }

    if (!user.passwordHash) {
      return fail(request, reply, "INVALID_CREDENTIALS", "Invalid credentials.", 401);
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      return fail(request, reply, "INVALID_CREDENTIALS", "Invalid credentials.", 401);
    }

    const token = await reply.jwtSign({ id: user._id.toHexString(), role: user.role ?? "buyer" });

    return ok(request, {
      token,
      user: toUserDto(user),
    });
  });

  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const col = usersCollection();
    if (!ObjectId.isValid(request.user.id)) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }
    const user = await col.findOne({ _id: new ObjectId(request.user.id) });
    if (!user) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }
    return ok(request, toUserDto(user));
  });
}
