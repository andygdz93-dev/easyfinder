// apps/web/src/pages/demo/Demo.tsx

import { Link } from "react-router-dom";
import type { Listing } from "@easyfinderai/shared";
import { demoListings, defaultScoringConfig, scoreListing } from "@easyfinderai/shared";
import { assignDemoImages } from "@easyfinderai/shared/demoImages";

export default function Demo() {
  const ranked = demoListings
    .map((listing) => ({
      listing,
      score: scoreListing(listing, defaultScoringConfig),
    }))
    .sort((a, b) => b.score.total - a.score.total);

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <section>
        <h1 className="text-3xl font-semibold text-slate-900">EasyFinder Ranked Inventory</h1>
        <p className="mt-2 text-slate-600">
          AI-assisted heavy equipment sourcing, tuned for capital efficiency.
        </p>
      </section>

      {/* LISTINGS GRID */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {ranked.map(({ listing, score }) => (
          <ListingCard key={listing.id} listing={listing} score={score.total} />
        ))}
      </section>
    </div>
  );
}

/* ---------------- CARD ---------------- */

function ListingCard({ listing, score }: { listing: Listing; score: number }) {
  const images = assignDemoImages({
    listingId: listing.id,
    category: listing.category,
    count: 5,
  });

  const hero = images[0];
  const thumbs = images.slice(1, 5);

  return (
    <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
      {/* IMAGE */}
      <div className="bg-slate-100">
        <img
          src={hero}
          alt={listing.title || "Listing image"}
          className="h-48 w-full object-cover"
          loading="lazy"
        />

        {/* THUMBNAILS */}
        <div className="grid grid-cols-4 gap-2 bg-white/80 p-3">
          {thumbs.map((src, idx) => (
            <img
              key={`${listing.id}-thumb-${idx}`}
              src={src}
              alt={`${listing.title || "Listing"} thumbnail ${idx + 1}`}
              className="h-16 w-full rounded-lg object-cover"
              loading="lazy"
            />
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="space-y-3 p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">{listing.category}</p>

        <h3 className="text-lg font-semibold text-slate-900">{listing.title}</h3>

        <div className="text-sm text-slate-600">
          ${Number(listing.price ?? 0).toLocaleString()} •{" "}
          {Number(listing.hours ?? 0).toLocaleString()} hrs • {listing.state}
        </div>

        <div className="flex items-center justify-between pt-3">
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black">
            Score {Math.round(score)}
          </span>

          <Link
            to={`/demo/listings/${listing.id}`}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );
}
