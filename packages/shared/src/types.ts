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

export const billingPlanSchema = z.enum(["free", "pro", "enterprise"]);
export type BillingPlan = z.infer<typeof billingPlanSchema>;

export const billingStatusSchema = z.enum(["active", "past_due", "canceled", "incomplete"]);
export type BillingStatus = z.infer<typeof billingStatusSchema>;

export const billingSchema = z.object({
  stripe_customer_id: z.string().optional(),
  stripe_subscription_id: z.string().optional(),
  plan: billingPlanSchema,
  status: billingStatusSchema,
  current_period_end: z.string(),
});
export type Billing = z.infer<typeof billingSchema>;

export const listingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  state: z.string(),
  price: z.number(),
  hours: z.number(),
  operable: z.boolean(),
  is_operable: z.boolean().optional(),
  year: z.number().optional(),
  condition: z.number().optional(),
  category: z.string(),
  imageUrl: urlOrPath.optional(),
  images: z
    .array(urlOrPath)
    .min(5, "Listing must have at least 5 images (hero + 4)"),
  source: z.string(),
  createdAt: z.string(),
})
  .transform((listing) => ({
    ...listing,
    imageUrl: listing.imageUrl ?? listing.images[0],
  }));

export type Listing = z.infer<typeof listingSchema>;

export const scoringConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  weights: z.object({
    price: z.number(),
    hours: z.number(),
    year: z.number(),
    location: z.number(),
    condition: z.number(),
    completeness: z.number(),
  }),
  preferredStates: z.array(z.string()),
  minHours: z.number(),
  maxHours: z.number(),
  minPrice: z.number(),
  maxPrice: z.number(),
  minYear: z.number(),
  maxYear: z.number(),
  minCondition: z.number(),
  maxCondition: z.number(),
  active: z.boolean().default(false),
});
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;

export const scoreBreakdownSchema = z.object({
  total: z.number(),
  breakdown: z.object({
    price: z.number(),
    hours: z.number(),
    year: z.number(),
    location: z.number(),
    condition: z.number(),
    completeness: z.number(),
  }),
  reasons: z.array(z.string()),
  confidence: z.number(),
  disqualified: z.boolean(),
});
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  billing: billingSchema.optional(),
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
