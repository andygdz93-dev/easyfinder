import { z } from "zod";

/**
 * Allow absolute URLs OR root-relative paths like /demo-images/...
 */
const urlOrPath = z.string().refine(
  (v) => v.startsWith("/") || /^https?:\/\//.test(v),
  "Must be an absolute URL or a root-relative path"
);

export const userRoleSchema = z.enum(["demo", "buyer", "seller", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const listingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  state: z.string(),
  price: z.number(),
  hours: z.number(),
  operable: z.boolean(),
  category: z.string(),
  imageUrl: urlOrPath.optional(),
  images: z.array(urlOrPath).optional(),
  source: z.string(),
  createdAt: z.string(),
});

export type Listing = z.infer<typeof listingSchema>;

export const scoringConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  weights: z.object({
    hours: z.number(),
    price: z.number(),
    state: z.number(),
  }),
  preferredStates: z.array(z.string()),
  maxHours: z.number(),
  maxPrice: z.number(),
  active: z.boolean().default(false),
});
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;

export const scoreBreakdownSchema = z.object({
  total: z.number(),
  components: z.object({
    operable: z.number(),
    hours: z.number(),
    price: z.number(),
    state: z.number(),
  }),
  rationale: z.array(z.string()),
});
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
});
export type User = z.infer<typeof userSchema>;

// Explicitly named alias for clarity when sharing user data externally.
export const userPublicSchema = userSchema;
export type UserPublic = User;

export const watchlistItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  listingId: z.string(),
  createdAt: z.string(),
});
export type WatchlistItem = z.infer<typeof watchlistItemSchema>;

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiResponseSchema = z
  .object({
    data: z.unknown().optional(),
    error: apiErrorSchema.optional(),
    requestId: z.string().optional(),
  })
  .refine((value) => value.data !== undefined || value.error !== undefined, {
    message: "Response must include data or error.",
  });
export type ApiResponse<T> = {
  data?: T;
  error?: ApiError;
  requestId?: string;
};
