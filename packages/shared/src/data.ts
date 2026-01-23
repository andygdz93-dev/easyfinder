import { Listing, User } from "./types.js";

const states = ["CA", "AZ", "TX", "IA", "NV", "CO", "WA", "OR"];
const categories = [
  "Excavator",
  "Bulldozer",
  "Wheel Loader",
  "Crawler Crane",
  "Telehandler",
  "Articulated Dump Truck",
];

export const demoUsers: User[] = [
  {
    id: "demo-user",
    email: "demo@easyfinder.ai",
    name: "Demo User",
    role: "demo",
  },
  {
    id: "buyer-user",
    email: "buyer@easyfinder.ai",
    name: "Buyer User",
    role: "buyer",
  },
  {
    id: "seller-user",
    email: "seller@easyfinder.ai",
    name: "Seller User",
    role: "seller",
  },
  {
    id: "admin-user",
    email: "admin@easyfinder.ai",
    name: "Admin User",
    role: "admin",
  },
];

export const generateListings = (count = 40): Listing[] =>
  Array.from({ length: count }).map((_, index) => {
    const state = states[index % states.length];
    const category = categories[index % categories.length];
    const price = 65000 + (index % 9) * 22000 + (index % 4) * 8000;
    const hours = 900 + (index % 10) * 520;
    return {
      id: `listing-${index + 1}`,
      title: `${state} ${category} ${index + 1}`,
      description: `Late-model ${category.toLowerCase()} with documented service history.`,
      state,
      price,
      hours,
      operable: index % 17 !== 0,
      category,
      imageUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef",
      source: index % 2 === 0 ? "auctionplanet" : "ironplanet",
      createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    };
  });

export const demoListings = generateListings(40);
