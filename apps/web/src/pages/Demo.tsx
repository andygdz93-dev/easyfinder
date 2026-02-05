// apps/web/src/pages/Demo.tsx

import { useState } from "react";
import { Link } from "react-router-dom";
import type { Listing } from "@easyfinderai/shared";
import { demoListings, defaultScoringConfig, scoreListing } from "@easyfinderai/shared";
import { useDemoWatchlist } from "../lib/demoWatchlist";
import { formatCategory } from "../lib/formatters";

export default function Demo() {
  const watchlist = useDemoWatchlist();
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const ranked = demoListings
    .map((listing) => ({
      listing,
      score: scoreListing(listing, defaultScoringConfig),
    }))
    .sort((a, b) => b.score.total - a.score.total);

  const visibleListings = showWatchlistOnly
    ? ranked.filter(({ listing }) => watchlist.isInWatchlist(listing.id))
    : ranked;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      {/* HEADER */}
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-900">EasyFinder Ranked Inventory</h1>
        <p className="mt-2 text-slate-600">
          AI-assisted heavy equipment sourcing, tuned for capital efficiency.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span>
            Saved listings: <strong className="text-slate-900">{watchlist.ids.length}</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowWatchlistOnly((prev) => !prev)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            {showWatchlistOnly ? "Show all listings" : "Show watchlist only"}
          </button>
        </div>
      </section>

      {/* LISTINGS GRID */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visibleListings.map(({ listing, score }) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            score={score.total}
            isSaved={watchlist.isInWatchlist(listing.id)}
            onToggleWatchlist={() => watchlist.toggle(listing.id)}
          />
        ))}
      </section>
    </div>
  );
}

/* ---------------- CARD ---------------- */

function ListingCard({
  listing,
  score,
  isSaved,
  onToggleWatchlist,
}: {
  listing: Listing;
  score: number;
  isSaved: boolean;
  onToggleWatchlist: () => void;
}) {
  const hero = listing.images[0];
  const thumbs = listing.images.slice(1, 5);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
      data-testid="listing-card"
    >
      {/* IMAGE */}
      <div className="space-y-3 p-4 md:p-5">
        <div className="h-44 w-full overflow-hidden rounded-lg bg-slate-100 md:h-52">
          <img
            src={hero}
            alt={listing.title || "Listing image"}
            data-testid="listing-hero"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* THUMBNAILS */}
        <div className="grid grid-cols-4 gap-2">
          {thumbs.map((src, idx) => (
            <div
              key={`${listing.id}-thumb-${idx}`}
              className="h-16 overflow-hidden rounded-md md:h-20"
            >
              <img
                src={src}
                alt={`${listing.title || "Listing"} thumbnail ${idx + 1}`}
                data-testid="listing-thumb"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="space-y-3 px-4 pb-4 md:px-5 md:pb-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {formatCategory(listing.category)}
        </p>

        <h3 className="text-lg font-semibold text-slate-900">{listing.title}</h3>

        <div className="text-sm text-slate-600">
          ${Number(listing.price ?? 0).toLocaleString()} •{" "}
          {Number(listing.hours ?? 0).toLocaleString()} hrs • {listing.state}
        </div>

        <div className="flex items-center justify-between pt-3">
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black">
            Score {Math.round(score)}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleWatchlist}
              className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
            </button>
            <Link
              to={`/demo/${listing.id}`}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
