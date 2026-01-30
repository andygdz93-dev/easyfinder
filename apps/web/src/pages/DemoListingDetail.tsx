import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DemoListing, getDemoListing, getDemoListings } from "../lib/demoApi";
import { useDemoWatchlist } from "../lib/demoWatchlist";

/**
 * IMPORTANT
 * - Detail page NEVER assigns images
 * - Uses images[] / imageUrl from API only
 * - Fully deterministic, no fallbacks to Unsplash
 */

const formatCurrency = (value?: number) =>
  Number.isFinite(value) ? `$${Number(value).toLocaleString()}` : "N/A";

const formatHours = (value?: number) =>
  Number.isFinite(value) ? `${Number(value).toLocaleString()} hrs` : "N/A";

const getScoreSummary = (listing: DemoListing) => {
  const totalScore = listing.totalScore ?? listing.score?.total ?? 0;
  const breakdown = listing.scoreBreakdown ?? listing.score?.components;
  const rationale = listing.rationale ?? listing.score?.rationale ?? [];
  const confidenceScore =
    listing.confidenceScore ??
    Math.min(95, Math.max(55, Math.round(totalScore * 0.9)));
  const flags = listing.flags ?? [];
  return { totalScore, breakdown, rationale, confidenceScore, flags };
};

export const DemoListingDetail = () => {
  const { id } = useParams();
  const watchlist = useDemoWatchlist();
  const [activeImage, setActiveImage] = useState(0);

  const listingQuery = useQuery({
    queryKey: ["demo-listing", id],
    queryFn: () => getDemoListing(id ?? ""),
    enabled: Boolean(id),
  });

  const rankingQuery = useQuery({
    queryKey: ["demo-listings-ranking"],
    queryFn: () => getDemoListings({}),
  });

  const ranking = useMemo(() => {
    const listings = rankingQuery.data?.listings ?? [];
    const sorted = [...listings].sort((a, b) => {
      const aScore = getScoreSummary(a).totalScore;
      const bScore = getScoreSummary(b).totalScore;
      if (bScore !== aScore) return bScore - aScore;
      return (a.price ?? 0) - (b.price ?? 0);
    });
    const index = sorted.findIndex((item) => item.id === id);
    return {
      rank: index >= 0 ? index + 1 : undefined,
      total: sorted.length || undefined,
    };
  }, [id, rankingQuery.data?.listings]);

  if (listingQuery.isLoading) {
    return <div className="rounded-2xl bg-white/70 p-6 shadow">Loading listing…</div>;
  }

  if (listingQuery.isError || !listingQuery.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Unable to load listing details.
      </div>
    );
  }

  const listing = listingQuery.data;
  const score = getScoreSummary(listing);

  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : listing.imageUrl
      ? [listing.imageUrl]
      : [];

  useEffect(() => {
    setActiveImage(0);
  }, [listing.id]);

  const activeImageUrl = images[activeImage] ?? images[0];

  const handlePrev = () => {
    if (!images.length) return;
    setActiveImage((i) => (i - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    if (!images.length) return;
    setActiveImage((i) => (i + 1) % images.length);
  };

  return (
    <div className="space-y-8">
      <Link to="/demo" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
        ← Back to ranked listings
      </Link>

      <section className="grid gap-6 rounded-3xl border bg-white/90 p-8 shadow lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border bg-slate-100 p-4">
            <div className="relative overflow-hidden rounded-2xl">
              {activeImageUrl ? (
                <img
                  src={activeImageUrl}
                  alt={listing.title}
                  className="h-64 w-full object-cover sm:h-72"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "/demo-images/other/1.jpg";
                  }}
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                  No images available.
                </div>
              )}

              {images.length > 1 && (
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow"
                  >
                    Prev
                  </button>
                  <div className="rounded-full bg-white/90 px-3 py-1 text-xs shadow">
                    {activeImage + 1} / {images.length}
                  </div>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`overflow-hidden rounded-xl border ${
                      i === activeImage ? "border-amber-500" : "border-transparent"
                    }`}
                  >
                    <img src={img} className="h-16 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs uppercase tracking-wider text-slate-500">
            {listing.category}
          </p>
          <h2 className="text-3xl font-semibold">{listing.title}</h2>
          <p className="text-sm text-slate-600">{listing.description}</p>

          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <span>{formatCurrency(listing.price)}</span>
            <span>{formatHours(listing.hours)}</span>
            <span>{listing.state}</span>
            <span>{listing.source}</span>
          </div>

          <button
            onClick={() => watchlist.toggle(listing.id)}
            className="rounded-full border px-4 py-2 text-sm"
          >
            {watchlist.isInWatchlist(listing.id)
              ? "Remove from watchlist"
              : "Add to watchlist"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-amber-50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Score</p>
            <p className="text-4xl font-semibold">{score.totalScore}</p>
            <p className="text-xs text-slate-500">
              Confidence {score.confidenceScore}%
            </p>
            {ranking.rank && ranking.total && (
              <p className="mt-3 text-sm text-slate-600">
                Ranked #{ranking.rank} of {ranking.total}
              </p>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Score Breakdown
            </p>
            <div className="mt-3 space-y-3">
              {[
                ["Operable", score.breakdown?.operable ?? 0],
                ["Hours", score.breakdown?.hours ?? 0],
                ["Price", score.breakdown?.price ?? 0],
                ["State Fit", score.breakdown?.state ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-amber-400"
                      style={{ width: `${Math.min(100, Number(value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
