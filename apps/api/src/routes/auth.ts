import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";
import { fail, ok } from "../response.js";

type UserDocument = {
  _id: ObjectId;
  email: string;
  emailLower: string;
  name: string;
  role: "buyer" | "seller" | "admin";
  passwordHash: string;
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

export default async function authRoutes(app: FastifyInstance) {
  const usersCollection = getCollection<UserDocument>("users");

  app.post("/register", async (request, reply) => {
    const payload = registerSchema.parse(request.body);
    const emailLower = payload.email.toLowerCase();
    const existing = await usersCollection.findOne({ emailLower });
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
      await usersCollection.insertOne(userDocument);
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
    const payload = loginSchema.parse(request.body);
    const emailLower = payload.email.toLowerCase();
    const user = await usersCollection.findOne({ emailLower });
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
    if (!ObjectId.isValid(request.user.id)) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }
    const user = await usersCollection.findOne({ _id: new ObjectId(request.user.id) });
    if (!user) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }
    return ok(request, toUserDto(user));
  });
}
