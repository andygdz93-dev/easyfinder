// apps/api/src/demo/demoListings.ts

import type { Listing } from "@easyfinderai/shared";
import { assignDemoImages } from "@easyfinderai/shared/demoImages";

/**
 * IMPORTANT RULES (do not break these):
 * - NO baseUrl here (API must stay origin-agnostic)
 * - Images must be ROOT-RELATIVE paths: /demo-images/...
 * - Category names can be human-friendly; normalizeCategory() handles mapping
 */

function makeListing(input: Omit<Listing, "images" | "imageUrl">): Listing {
  const images = assignDemoImages({
    listingId: String(input.id),
    category: input.category,
    count: 5,
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
    id: "demo-3",
    title: "2016 Deere 210G Excavator",
    description: "Balanced excavator with mid-range hours and strong hydraulics.",
    state: "NV",
    price: 122000,
    hours: 4100,
    operable: true,
    category: "Excavator",
    source: "machinerytrader",
    createdAt: "2025-12-05T09:20:00.000Z",
  }),
  makeListing({
    id: "demo-4",
    title: "2021 Volvo EC250 Excavator",
    description: "Late-model excavator, warranty transfer available.",
    state: "AZ",
    price: 206000,
    hours: 950,
    operable: true,
    category: "Excavator",
    source: "auctiontime",
    createdAt: "2025-12-12T11:00:00.000Z",
  }),

  // DOZER
  makeListing({
    id: "demo-5",
    title: "2017 CAT D6T Dozer",
    description: "Strong push power with updated blade hydraulics.",
    state: "IA",
    price: 198000,
    hours: 3600,
    operable: true,
    category: "Dozer",
    source: "ritchiebros",
    createdAt: "2025-12-03T14:40:00.000Z",
  }),
  makeListing({
    id: "demo-6",
    title: "2015 Komatsu D65 Dozer",
    description: "Reliable dozer with premium undercarriage.",
    state: "CO",
    price: 148000,
    hours: 5200,
    operable: true,
    category: "Dozer",
    source: "ironplanet",
    createdAt: "2025-11-28T12:15:00.000Z",
  }),

  // SKID STEER
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
  makeListing({
    id: "demo-10",
    title: "2018 Bobcat S650 Skid Steer",
    description: "High-flow skid steer with attachment package.",
    state: "CA",
    price: 68000,
    hours: 1900,
    operable: true,
    category: "Skid Steer",
    source: "heavyequipment",
    createdAt: "2025-12-01T10:10:00.000Z",
  }),

  // WHEEL LOADER
  makeListing({
    id: "demo-13",
    title: "2019 CAT 930M Wheel Loader",
    description: "Production-ready loader with scale system.",
    state: "NV",
    price: 162000,
    hours: 2800,
    operable: true,
    category: "Wheel Loader",
    source: "ironplanet",
    createdAt: "2025-12-07T12:45:00.000Z",
  }),
  makeListing({
    id: "demo-14",
    title: "2017 Volvo L90 Wheel Loader",
    description: "Efficient loader with updated bucket pins.",
    state: "CA",
    price: 148000,
    hours: 4200,
    operable: true,
    category: "Wheel Loader",
    source: "ritchiebros",
    createdAt: "2025-12-02T09:00:00.000Z",
  }),

  // BACKHOE
  makeListing({
    id: "demo-17",
    title: "2018 CAT 420F Backhoe",
    description: "Backhoe with extendahoe and clean hydraulics.",
    state: "TX",
    price: 98000,
    hours: 2300,
    operable: true,
    category: "Backhoe",
    source: "govplanet",
    createdAt: "2025-12-04T08:20:00.000Z",
  }),

  // TELEHANDLER
  makeListing({
    id: "demo-21",
    title: "2020 JLG 1055 Telehandler",
    description: "High-reach telehandler with low hours.",
    state: "CA",
    price: 132000,
    hours: 1500,
    operable: true,
    category: "Telehandler",
    source: "ritchiebros",
    createdAt: "2025-12-12T16:10:00.000Z",
  }),
];
