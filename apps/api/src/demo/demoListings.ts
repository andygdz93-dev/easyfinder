import type { Listing } from "@easyfinderai/shared";
import { assignDemoImages } from "@easyfinderai/shared/demoImages";

// 🔒 DEMO IMAGE HOST (Vercel demo site)
const DEMO_IMAGE_BASE_URL =
  "https://web-easyfinder.vercel.app";

function makeListing(
  input: Omit<Listing, "images" | "imageUrl">
): Listing {
  const images = assignDemoImages({
    listingId: input.id,
    category: input.category,
    count: 5,
    baseUrl: DEMO_IMAGE_BASE_URL, // ✅ CRITICAL FIX
  });

  return {
    ...input,
    images,
    imageUrl: images[0],
  };
}

export const demoListings: Listing[] = [
  makeListing({
    id: "demo-1",
    title: "2020 CAT 320 Excavator",
    description: "Well-maintained excavator with low hours and clean service logs.",
    state: "CA",
    price: 178000,
    hours: 1800,
    operable: true,
    category: "Excavator",
    source: "auctionplanet",
    imageURL: 
    "https://drive.google.com/file/d/1yr0u0r5294i36VG4iHU4lSF0gSifPx02/view?usp=drive_link",
    "https://drive.google.com/file/d/1_Fur-Q4cB8tPRqq4sf_g27OUhoiwYeRJ/view?usp=drive_link",
    "https://drive.google.com/file/d/1e5r8b-pmRL_gmXhXu20kq2w-LklRMjKS/view?usp=drive_link",
    "https://drive.google.com/file/d/1i1UmOjRulS2HrKgoRxcxZZoYoKyGk1bi/view?usp=drive_link",
    "https://drive.google.com/file/d/19L6QUOpGr1HqmmsYT3kGDmOYjn44ySyQ/view?usp=drive_link",
    createdAt: "2025-12-10T15:12:00.000Z",
  }),

  makeListing({
    id: "demo-2",
    title: "2018 Komatsu PC210 Excavator",
    description: "Job-ready excavator with fresh undercarriage inspection.",
    state: "TX",
    price: 154000,
    hours: 3200,
    operable: true,
    category: "Excavator",
    source: "ironplanet",
    createdAt: "2025-12-08T10:35:00.000Z",
  }),

  makeListing({
    id: "demo-9",
    title: "2020 CAT 262D Skid Steer",
    description: "Compact skid steer with new tires and cab.",
    state: "AZ",
    price: 72000,
    hours: 1100,
    operable: true,
    category: "Skid Steer",
    source: "auctiontime",
    createdAt: "2025-12-11T08:30:00.000Z",
  }),

  // …keep the rest exactly as-is
];
