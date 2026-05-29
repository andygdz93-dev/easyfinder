import { getCollection } from "../db.js";

export interface CategoryBenchmark {
  category: string;
  medianPrice: number | null;
  medianHours: number | null;
  avgPrice: number | null;
  avgHours: number | null;
  count: number;
  updatedAt: string;
}

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
};

const avg = (values: number[]): number | null => {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

export async function recalculateBenchmarks(): Promise<CategoryBenchmark[]> {
  const listings = getCollection("listings");
  const benchmarksCol = getCollection("benchmarks");

  const raw = await listings
    .find(
      { status: "active", isPublished: true },
      { projection: { category: 1, price: 1, hours: 1 } }
    )
    .toArray();

  // Group by category
  const grouped: Record<string, { prices: number[]; hours: number[] }> = {};
  for (const doc of raw) {
    const cat = (doc.category as string) ?? "other";
    if (!grouped[cat]) grouped[cat] = { prices: [], hours: [] };
    if (typeof doc.price === "number" && Number.isFinite(doc.price) && doc.price > 0) {
      grouped[cat]!.prices.push(doc.price);
    }
    if (typeof doc.hours === "number" && Number.isFinite(doc.hours) && doc.hours >= 0) {
      grouped[cat]!.hours.push(doc.hours);
    }
  }

  const now = new Date().toISOString();
  const benchmarks: CategoryBenchmark[] = [];

  for (const [category, data] of Object.entries(grouped)) {
    const benchmark: CategoryBenchmark = {
      category,
      medianPrice: median(data.prices),
      medianHours: median(data.hours),
      avgPrice: avg(data.prices),
      avgHours: avg(data.hours),
      count: raw.filter((d) => (d.category ?? "other") === category).length,
      updatedAt: now,
    };
    benchmarks.push(benchmark);

    await benchmarksCol.updateOne(
      { category },
      { $set: benchmark },
      { upsert: true }
    );
  }

  return benchmarks;
}
