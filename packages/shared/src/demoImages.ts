// demoImages.ts

export type DemoCategory =
  | "attachment"
  | "backhoe"
  | "crane"
  | "dozer"
  | "dump-truck"
  | "excavator"
  | "forklift"
  | "grader"
  | "other"
  | "roller"
  | "skid-steer"
  | "telehandler"
  | "wheel-loader";

const LIB: Record<DemoCategory, string[]> = {
  excavator: [
    "/demo-images/excavator/1.jpg",
    "/demo-images/excavator/2.jpg",
    "/demo-images/excavator/3.jpg",
    "/demo-images/excavator/4.jpg",
    "/demo-images/excavator/5.jpg",
  ],
  "skid-steer": [
    "/demo-images/skid-steer/1.jpg",
    "/demo-images/skid-steer/2.jpg",
    "/demo-images/skid-steer/3.jpg",
    "/demo-images/skid-steer/4.jpg",
    "/demo-images/skid-steer/5.jpg",
  ],
  dozer: [
    "/demo-images/dozer/1.jpg",
    "/demo-images/dozer/2.jpg",
    "/demo-images/dozer/3.jpg",
    "/demo-images/dozer/4.jpg",
    "/demo-images/dozer/5.jpg",
  ],
  "wheel-loader": [
    "/demo-images/wheel-loader/1.jpg",
    "/demo-images/wheel-loader/2.jpg",
    "/demo-images/wheel-loader/3.jpg",
    "/demo-images/wheel-loader/4.jpg",
    "/demo-images/wheel-loader/5.jpg",
  ],
  backhoe: [
    "/demo-images/backhoe/1.jpg",
    "/demo-images/backhoe/2.jpg",
    "/demo-images/backhoe/3.jpg",
    "/demo-images/backhoe/4.jpg",
    "/demo-images/backhoe/5.jpg",
  ],
  forklift: [
    "/demo-images/forklift/1.jpg",
    "/demo-images/forklift/2.jpg",
    "/demo-images/forklift/3.jpg",
    "/demo-images/forklift/4.jpg",
    "/demo-images/forklift/5.jpg",
  ],
  crane: [
    "/demo-images/crane/1.jpg",
    "/demo-images/crane/2.jpg",
    "/demo-images/crane/3.jpg",
    "/demo-images/crane/4.jpg",
    "/demo-images/crane/5.jpg",
  ],
  roller: [
    "/demo-images/roller/1.jpg",
    "/demo-images/roller/2.jpg",
    "/demo-images/roller/3.jpg",
    "/demo-images/roller/4.jpg",
    "/demo-images/roller/5.jpg",
  ],
  grader: [
    "/demo-images/grader/1.jpg",
    "/demo-images/grader/2.jpg",
    "/demo-images/grader/3.jpg",
    "/demo-images/grader/4.jpg",
    "/demo-images/grader/5.jpg",
  ],
  telehandler: [
    "/demo-images/telehandler/1.jpg",
    "/demo-images/telehandler/2.jpg",
    "/demo-images/telehandler/3.jpg",
    "/demo-images/telehandler/4.jpg",
    "/demo-images/telehandler/5.jpg",
  ],
  "dump-truck": [
    "/demo-images/dump-truck/1.jpg",
    "/demo-images/dump-truck/2.jpg",
    "/demo-images/dump-truck/3.jpg",
    "/demo-images/dump-truck/4.jpg",
    "/demo-images/dump-truck/5.jpg",
  ],
  attachment: [
    "/demo-images/attachment/1.jpg",
    "/demo-images/attachment/2.jpg",
    "/demo-images/attachment/3.jpg",
    "/demo-images/attachment/4.jpg",
    "/demo-images/attachment/5.jpg",
  ],
  other: [
    "/demo-images/other/1.jpg",
    "/demo-images/other/2.jpg",
    "/demo-images/other/3.jpg",
    "/demo-images/other/4.jpg",
    "/demo-images/other/5.jpg",
  ],
};

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rotate<T>(arr: T[], start: number, count: number): T[] {
  if (!arr.length) return [];
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(arr[(start + i) % arr.length]);
  }
  return out;
}

/**
 * STRICT normalization
 * Converts all listing.category strings into the demo image library keys
 */
export function normalizeCategory(raw?: string | null): DemoCategory {
  const s = (raw ?? "").toLowerCase();

  if (s.includes("excav")) return "excavator";
  if (s.includes("skid")) return "skid-steer";
  if (s.includes("doz")) return "dozer";
  if (s.includes("wheel") && s.includes("load")) return "wheel-loader";
  if (s.includes("backhoe")) return "backhoe";
  if (s.includes("fork")) return "forklift";
  if (s.includes("crane")) return "crane";
  if (s.includes("roller") || s.includes("compactor")) return "roller";
  if (s.includes("grader")) return "grader";
  if (s.includes("tele")) return "telehandler";
  if (s.includes("dump")) return "dump-truck";
  if (s.includes("attach") || s.includes("bucket") || s.includes("hammer"))
    return "attachment";

  return "other";
}

export function assignDemoImages(args: {
  listingId: string;
  category?: string | null;
  count?: number;
  baseUrl?: string;
}): string[] {
  const { listingId, category, count = 5, baseUrl } = args;

  const cat = normalizeCategory(category);
  const pool = LIB[cat] ?? LIB.other;

  const seed = fnv1a32(`${listingId}:${cat}`);
  const start = pool.length ? seed % pool.length : 0;

  const picked = rotate(pool, start, Math.min(count, pool.length));

  if (!picked.length) {
    const fallback = "/demo-images/other/1.jpg";
    return baseUrl ? [`${baseUrl}${fallback}`] : [fallback];
  }

  return baseUrl ? picked.map((p) => `${baseUrl}${p}`) : picked;
}
