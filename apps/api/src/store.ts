import { defaultScoringConfig, demoUsers } from "@easyfinderai/shared";
import bcrypt from "bcryptjs";
import type { Listing, User, WatchlistItem, ScoringConfig } from "@easyfinderai/shared";
export type StoredUser = User & { passwordHash?: string };


const seedPasswords: Record<string, string> = {
  "demo@easyfinder.ai": "DemoPass123!",
  "buyer@easyfinder.ai": "BuyerPass123!",
  "seller@easyfinder.ai": "SellerPass123!",
  "admin@easyfinder.ai": "AdminPass123!",
};

export const listings: Listing[] = [];
export const users: StoredUser[] = demoUsers.map((user) => {
  if (!user.email) throw new Error("Seed user must have an email");

  const seed = seedPasswords[user.email];
  return {
    ...user,
    passwordHash: seed ? bcrypt.hashSync(seed, 10) : undefined,
  };
});

export const demoUserId = users[0]?.id ?? "demo-user";

let scoringConfig: ScoringConfig = { ...defaultScoringConfig };

export const getScoringConfig = () => scoringConfig;
export const setScoringConfig = (next: ScoringConfig) => {
  scoringConfig = next;
};

export const watchlists = new Map<string, Map<string, WatchlistItem>>();

export const sourceHealth = new Map([
  ["auctionplanet", { status: "healthy", lastSync: new Date().toISOString() }],
  ["ironplanet", { status: "healthy", lastSync: new Date().toISOString() }],
  ["govplanet", { status: "degraded", lastSync: new Date().toISOString() }],
  ["machinerytrader", { status: "unknown", lastSync: null }],
  ["heavyequipment", { status: "unknown", lastSync: null }],
  ["auctiontime", { status: "unknown", lastSync: null }],
  ["bidadoo", { status: "unknown", lastSync: null }],
  ["ritchiebros", { status: "unknown", lastSync: null }],
]);
