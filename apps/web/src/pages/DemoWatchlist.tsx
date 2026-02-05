// apps/web/src/pages/DemoWatchlist.tsx

import { Link } from "react-router-dom";
import { demoListings } from "@easyfinderai/shared";
import { useDemoWatchlist } from "../lib/demoWatchlist";
import DemoListingCard from "../components/DemoListingCard";

/**
 * IMPORTANT
 * - No assignDemoImages in frontend
 * - Uses API-provided listing.images / listing.imageUrl only
 */

export const DemoWatchlist = () => {
  const watchlist = useDemoWatchlist();

  const saved = demoListings.filter((listing) => watchlist.ids.includes(listing.id));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Watchlist
          </p>
          <h2 className="demo-title text-3xl font-semibold text-slate-900">
            Saved Opportunities
          </h2>
          <p className="text-sm text-slate-600">
            Track the equipment that deserves a second look.
          </p>
        </div>

        <Link
          to="/demo"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
        >
          Back to listings
        </Link>
      </div>

      {saved.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/80 p-4 text-sm text-slate-600 shadow">
          No saved listings yet. Add listings from the demo page to build a watchlist.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {saved.map((listing) => (
            <DemoListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
};
