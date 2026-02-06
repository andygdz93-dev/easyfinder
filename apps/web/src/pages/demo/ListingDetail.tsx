import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { demoListings, defaultScoringConfig, scoreListing } from "@easyfinderai/shared";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import ImageGallery from "../../components/ImageGallery";
import { useDemoWatchlist } from "../../lib/demoWatchlist";
import { formatCategory } from "../../lib/formatters";

export default function DemoListingDetail() {
  const { id } = useParams();
  const listing = demoListings.find((l) => l.id === id);
  const watchlist = useDemoWatchlist();

  if (!listing) {
    return (
      <Card className="p-6 text-sm text-rose-500 space-y-4">
        <p>Unable to load listing details.</p>
        <Link to="/demo/listings">
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

  const breakdown = scoreListing(listing, defaultScoringConfig);
  const components = breakdown?.components ?? {};
  const rationale = breakdown?.rationale ?? [];
  const listingId = listing.id ?? "";
  const isSaved = listingId ? watchlist.isInWatchlist(listingId) : false;
  const displayPrice = listing.price ? `$${listing.price.toLocaleString()}` : "—";
  const displayHours = listing.hours ? `${listing.hours.toLocaleString()} hrs` : "—";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {initialGallery.length > 0 ? (
            <ImageGallery
              images={initialGallery}
              alt={listing.title ?? "Listing image"}
              maxThumbs={4}
              imagesKey={listing.id ?? listing.title}
              heroClassName="h-[220px] rounded-2xl ring-2 ring-amber-300/70 sm:h-[240px] lg:h-[320px]"
              heroImageClassName="object-center"
              heroTestId="demo-detail-hero"
              heroImageTestId="demo-hero"
              thumbsClassName="mt-3"
              thumbClassName="h-12 sm:h-14 transition hover:ring-2 hover:ring-amber-300/70 focus:outline-none focus:ring-2 focus:ring-amber-300"
              fallbackSrc="/demo-images/other/1.jpg"
              getThumbTestId={(index) => `demo-thumb-${index}`}
            />
          ) : (
            <div className="h-[220px] w-full rounded-2xl bg-slate-100 p-6 text-slate-500 sm:h-[240px] lg:h-[320px]">
              No images available.
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
                  {breakdown?.total ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Price</span>
                <span>{displayPrice}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Hours</span>
                <span>{displayHours}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">State</span>
                <span>{listing.state ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Source</span>
                <span className="capitalize">{listing.source ?? "—"}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!listingId) return;
                  watchlist.toggle(listingId);
                }}
              >
                {isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
              </Button>
              <Link to="/demo/listings">
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
              <span className="font-semibold">{components.operable ?? "—"}</span>
            </li>
            <li className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
              <span>Hours</span>
              <span className="font-semibold">{components.hours ?? "—"}</span>
            </li>
            <li className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
              <span>Price</span>
              <span className="font-semibold">{components.price ?? "—"}</span>
            </li>
            <li className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
              <span>State</span>
              <span className="font-semibold">{components.state ?? "—"}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border bg-white p-4 md:p-5" data-testid="demo-detail-rationale">
          <h3 className="text-sm font-semibold text-slate-900">Why this score</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {rationale.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
