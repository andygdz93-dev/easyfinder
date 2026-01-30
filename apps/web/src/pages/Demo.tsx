import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DemoListing, getDemoListings } from "../lib/demoApi";
import { useDemoWatchlist } from "../lib/demoWatchlist";

/**
 * IMPORTANT
 * - Frontend NEVER assigns demo images
 * - API already provides images[] + imageUrl
 * - Frontend only selects which one to show
 */

const getCardImage = (listing: DemoListing) => {
  const imgs =
    listing.images && listing.images.length > 0
      ? listing.images
      : listing.imageUrl
      ? [listing.imageUrl]
      : [];

  if (!imgs.length) return "/demo-images/other/1.jpg";

  const n = Number(String(listing.id).replace(/\D/g, "")) || 0;
  return imgs[n % imgs.length];
};

const getThumbs = (listing: DemoListing, count = 4) => {
  const imgs = listing.images && listing.images.length > 0 ? listing.images : [];
  if (!imgs.length) return [];

  const n = Number(String(listing.id).replace(/\D/g, "")) || 0;
  const start = n % imgs.length;

  return Array.from(
    { length: Math.min(count, imgs.length) },
    (_, i) => imgs[(start + i) % imgs.length]
  );
};

const categories = [
  "All",
  "Excavator",
  "Dozer",
  "Skid Steer",
  "Wheel Loader",
  "Backhoe",
  "Telehandler",
];

const states = ["Any", "CA", "AZ", "TX", "IA", "NV", "CO", "WA", "OR", "UT"];

const formatCurrency = (value?: number) =>
  Number.isFinite(value) ? `$${Number(value).toLocaleString()}` : "N/A";

const formatHours = (value?: number) =>
  Number.isFinite(value) ? `${Number(value).toLocaleString()} hrs` : "N/A";

const getScoreSummary = (listing: DemoListing) => {
  const totalScore = listing.totalScore ?? listing.score?.total ?? 0;
  const rationale = listing.rationale ?? listing.score?.rationale ?? [];
  const confidenceScore =
    listing.confidenceScore ??
    Math.min(95, Math.max(55, Math.round(totalScore * 0.9)));
  const flags = listing.flags ?? [];
  return { totalScore, rationale, confidenceScore, flags };
};

export const Demo = () => {
  const [category, setCategory] = useState("All");
  const [state, setState] = useState("Any");
  const [maxHours, setMaxHours] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const watchlist = useDemoWatchlist();

  const listingsQuery = useQuery({
    queryKey: ["demo-listings", state, maxHours, maxPrice],
    queryFn: () =>
      getDemoListings({
        state: state !== "Any" ? state : undefined,
        maxHours: maxHours ? Number(maxHours) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      }),
  });

  const listings = listingsQuery.data?.listings ?? [];

  const filtered = useMemo(() => {
    if (category === "All") return listings;
    return listings.filter((l) => l.category === category);
  }, [category, listings]);

  return (
    <div className="space-y-10">
      {listingsQuery.isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-white/60" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((listing) => {
            const score = getScoreSummary(listing);
            const isBest = score.flags.includes("Best Option");

            return (
              <article
                key={listing.id}
                className={`group grid gap-4 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-lg transition ${
                  isBest ? "ring-2 ring-amber-400/70" : ""
                }`}
              >
                <div className="overflow-hidden rounded-2xl border bg-slate-100">
                  <img
                    src={getCardImage(listing)}
                    alt={listing.title}
                    className="h-44 w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "/demo-images/other/1.jpg";
                    }}
                  />

                  {listing.images?.length ? (
                    <div className="grid grid-cols-4 gap-2 bg-white/80 p-3">
                      {getThumbs(listing).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          className="h-16 w-full rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      {listing.category}
                    </p>
                    <h3 className="text-xl font-semibold">{listing.title}</h3>
                    <p className="text-xs text-slate-500">
                      {listing.state} · {listing.source}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      Score {score.totalScore}
                    </span>
                    <p className="text-xs text-slate-500">
                      Confidence {score.confidenceScore}%
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 text-sm text-slate-600">
                  <span>{formatCurrency(listing.price)}</span>
                  <span>{formatHours(listing.hours)}</span>
                </div>

                <div className="flex gap-3">
                  <Link
                    to={`/demo/listings/${listing.id}`}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
                  >
                    View details
                  </Link>
                  <button
                    onClick={() => watchlist.toggle(listing.id)}
                    className="rounded-full border px-4 py-2 text-sm"
                  >
                    {watchlist.isInWatchlist(listing.id)
                      ? "Remove"
                      : "Add to watchlist"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
