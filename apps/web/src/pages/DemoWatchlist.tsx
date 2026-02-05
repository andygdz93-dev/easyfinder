// apps/web/src/pages/DemoWatchlist.tsx

import { Link } from "react-router-dom";
import { demoListings } from "@easyfinderai/shared";
import { useDemoWatchlist } from "../lib/demoWatchlist";
import { formatCategory } from "../lib/formatters";

/**
 * IMPORTANT
 * - No assignDemoImages in frontend
 * - Uses API-provided listing.images / listing.imageUrl only
 */

const formatCurrency = (value?: number) =>
  Number.isFinite(value) ? `$${Number(value).toLocaleString()}` : "N/A";

const formatHours = (value?: number) =>
  Number.isFinite(value) ? `${Number(value).toLocaleString()} hrs` : "N/A";

const getCardImage = (listing: (typeof demoListings)[number]) => {
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

export const DemoWatchlist = () => {
  const watchlist = useDemoWatchlist();

  const saved = demoListings.filter((listing) => watchlist.ids.includes(listing.id));

  return (
    <div className="space-y-8">
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
        <div className="rounded-3xl border border-black/10 bg-white/80 p-6 text-sm text-slate-600 shadow">
          No saved listings yet. Add listings from the demo page to build a watchlist.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {saved.map((listing) => (
            <article
              key={listing.id}
              className="grid gap-4 rounded-3xl border border-black/10 bg-white/90 p-6 shadow"
            >
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-slate-100">
                <img
                  src={getCardImage(listing)}
                  alt={listing.title || "Listing"}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "/demo-images/other/1.jpg";
                  }}
                />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  {formatCategory(listing.category)}
                </p>
                <h3 className="demo-title text-xl font-semibold text-slate-900">
                  {listing.title || "Listing"}
                </h3>
                <p className="text-xs text-slate-500">
                  {listing.state || "State N/A"} · {listing.source || "Source N/A"}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <span>{formatCurrency(listing.price)}</span>
                <span>{formatHours(listing.hours)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/demo/${listing.id}`}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  View Details
                </Link>

                <button
                  type="button"
                  onClick={() => watchlist.remove(listing.id)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
