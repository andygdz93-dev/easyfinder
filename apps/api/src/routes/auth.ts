import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { fail, ok } from "../response.js";
import { getUsersCollection, UserDocument } from "../users.js";
import { defaultBilling } from "../billing.js";
import { sendPasswordResetEmail } from "../email.js";
import { getPasswordResetTokensCollection } from "../passwordResetTokens.js";
import { audit } from "../lib/audit.js";

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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

export default async function authRoutes(app: FastifyInstance) {
  const usersCollection = () => getUsersCollection();
  const passwordResetTokensCollection = () => getPasswordResetTokensCollection();

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
      role: null,
      passwordHash,
      ndaAccepted: false,
      ndaAcceptedAt: null,
      billing: defaultBilling(),
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

    const token = await reply.jwtSign({
      id: userDocument._id.toHexString(),
      email: userDocument.email,
      role: null,
      name: userDocument.name,
    });

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

    const token = await reply.jwtSign({
      id: user._id.toHexString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    audit("USER_LOGIN", {
      userId: user._id.toHexString(),
      email: user.email,
      ip: request.ip,
    });

    return ok(request, {
      token,
      user: toUserDto(user),
    });
  });

  app.post("/forgot-password", async (request) => {
    const usersCol = usersCollection();
    const payload = forgotPasswordSchema.parse(request.body);
    const emailLower = payload.email.toLowerCase();
    const user = await usersCol.findOne({ emailLower });

    if (user) {
      audit("PASSWORD_RESET_REQUESTED", {
        userId: user._id.toHexString(),
        email: user.email,
        ip: request.ip,
      });

      const token = randomBytes(32).toString("hex");
      const now = new Date();
      const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);

      await passwordResetTokensCollection().insertOne({
        _id: new ObjectId(),
        user_id: user._id,
        token,
        created_at: now,
        expires_at: expiresAt,
      });

      await sendPasswordResetEmail(user.email, token);
    }

    return ok(request, { success: true });
  });

  app.post("/reset-password", async (request, reply) => {
    const usersCol = usersCollection();
    const tokensCol = passwordResetTokensCollection();
    const payload = resetPasswordSchema.parse(request.body);

    const resetToken = await tokensCol.findOne({
      token: payload.token,
      expires_at: { $gt: new Date() },
    });

    if (!resetToken) {
      return fail(request, reply, "INVALID_TOKEN", "Invalid or expired reset token.", 400);
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 10);

    await usersCol.updateOne(
      { _id: resetToken.user_id },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
      }
    );

    await tokensCol.deleteOne({ _id: resetToken._id });

    return ok(request, { success: true });
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
