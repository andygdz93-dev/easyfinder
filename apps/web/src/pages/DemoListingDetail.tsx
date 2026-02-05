import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { demoListings, defaultScoringConfig, scoreListing } from "@easyfinderai/shared";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useDemoWatchlist } from "../lib/demoWatchlist";
import { formatCategory } from "../lib/formatters";

export default function DemoListingDetail() {
  const { id } = useParams();
  const listing = demoListings.find((l) => l.id === id);
  const watchlist = useDemoWatchlist();

  if (!listing) {
    return (
      <Card className="p-6 text-sm text-rose-500 space-y-4">
        <p>Unable to load listing details.</p>
        <Link to="/demo">
          <Button variant="secondary">← Back to demo</Button>
        </Link>
      </Card>
    );
  }

  const initialGallery = useMemo(() => {
    const imageSet = listing.images?.length
      ? listing.images
      : listing.imageUrl
      ? [listing.imageUrl]
      : [];
    return imageSet.filter(Boolean);
  }, [listing.id, listing.imageUrl, listing.images]);

  const [gallery, setGallery] = useState<string[]>(initialGallery);

  useEffect(() => {
    setGallery(initialGallery);
  }, [initialGallery]);

  const breakdown = scoreListing(listing, defaultScoringConfig);
  const hero = gallery[0];
  const thumbnails = gallery.slice(1, 5);
  const isSaved = watchlist.isInWatchlist(listing.id);

  const swapHero = (actualIndex: number) => {
    setGallery((current) => {
      if (actualIndex <= 0 || actualIndex >= current.length) return current;
      const next = [...current];
      [next[0], next[actualIndex]] = [next[actualIndex], next[0]];
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {hero ? (
            <div
              className="h-[220px] w-full overflow-hidden rounded-2xl bg-slate-100 ring-2 ring-amber-300/70 sm:h-[240px] lg:h-[320px]"
              data-testid="demo-detail-hero"
            >
              <img
                src={hero}
                alt={listing.title}
                data-testid="demo-hero"
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/demo-images/other/1.jpg";
                }}
              />
            </div>
          ) : (
            <div className="h-[220px] w-full rounded-2xl bg-slate-100 p-6 text-slate-500 sm:h-[240px] lg:h-[320px]">
              No images available.
            </div>
          )}

          {thumbnails.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {thumbnails.map((img, idx) => {
                const actualIndex = idx + 1;
                return (
                  <button
                    key={`${img}-${actualIndex}`}
                    type="button"
                    data-testid={`demo-thumb-${actualIndex}`}
                    className="h-12 overflow-hidden rounded-lg bg-slate-100 transition hover:ring-2 hover:ring-amber-300/70 focus:outline-none focus:ring-2 focus:ring-amber-300 sm:h-14"
                    onClick={() => swapHero(actualIndex)}
                  >
                    <img
                      src={img}
                      alt={`${listing.title} ${actualIndex}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/demo-images/other/1.jpg";
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="space-y-3 rounded-2xl border bg-white p-4 md:p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {formatCategory(listing.category)}
              </p>
              <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">{listing.title}</h1>
              <p className="mt-1 text-sm text-slate-700">{listing.description}</p>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total score</span>
                <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black">
                  {breakdown.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Price</span>
                <span>${listing.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Hours</span>
                <span>{listing.hours.toLocaleString()} hrs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">State</span>
                <span>{listing.state}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Source</span>
                <span className="capitalize">{listing.source}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => watchlist.toggle(listing.id)}>
                {isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
              </Button>
              <Link to="/demo">
                <Button variant="secondary">← Back to demo</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 md:p-5" data-testid="demo-detail-breakdown">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Score Breakdown</h2>
            <p className="text-sm text-slate-700">
              Weighted scoring across operability, hours, price, and location.
            </p>
          </div>

          <ul className="mt-3 text-sm text-slate-700">
            <li className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
              <span>Operable</span>
              <span className="font-semibold">{breakdown.components.operable}</span>
            </li>
            <li className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
              <span>Hours</span>
              <span className="font-semibold">{breakdown.components.hours}</span>
            </li>
            <li className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
              <span>Price</span>
              <span className="font-semibold">{breakdown.components.price}</span>
            </li>
            <li className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
              <span>State</span>
              <span className="font-semibold">{breakdown.components.state}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border bg-white p-4 md:p-5" data-testid="demo-detail-rationale">
          <h3 className="text-sm font-semibold text-slate-900">Why this score</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {breakdown.rationale.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
