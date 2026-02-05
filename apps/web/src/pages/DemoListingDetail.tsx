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

  const breakdown = scoreListing(listing, defaultScoringConfig);
  const hero = listing.images[0];
  const thumbnails = listing.images.slice(1, 5);
  const isSaved = watchlist.isInWatchlist(listing.id);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4">
      {hero ? (
        <div className="h-[240px] w-full overflow-hidden rounded-xl bg-slate-900 md:h-[420px]">
          <img
            src={hero}
            alt={listing.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/demo-images/other/1.jpg";
            }}
          />
        </div>
      ) : (
        <div className="h-[240px] w-full rounded-xl bg-slate-100 p-10 text-slate-500 md:h-[420px]">
          No images available.
        </div>
      )}

      {thumbnails.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {thumbnails.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`${listing.title} ${idx + 1}`}
              className="h-20 w-full rounded-lg object-cover md:h-24"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/demo-images/other/1.jpg";
              }}
            />
          ))}
        </div>
      )}

      <Card className="rounded-xl border p-4 md:p-6 space-y-3">
        <h1 className="text-2xl font-semibold">{listing.title}</h1>
        <p className="text-slate-500">{listing.description}</p>

        <div className="text-sm text-slate-600 flex gap-4">
          <span>${listing.price.toLocaleString()}</span>
          <span>{listing.hours.toLocaleString()} hrs</span>
          <span>{listing.state}</span>
          <span>{formatCategory(listing.category)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black">
            Total Score {breakdown.total}
          </span>
          <Button variant="outline" onClick={() => watchlist.toggle(listing.id)}>
            {isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
          </Button>
          <Link to="/demo">
            <Button variant="secondary">← Back to demo</Button>
          </Link>
        </div>
      </Card>

      <Card className="rounded-xl border p-4 md:p-6 space-y-4" data-testid="score-breakdown">
        <div>
          <h2 className="text-lg font-semibold">Score Breakdown</h2>
          <p className="text-sm text-slate-500">
            Weighted scoring across operability, hours, price, and location.
          </p>
        </div>

        <ul className="grid gap-2 text-sm text-slate-700">
          <li className="flex items-center justify-between">
            <span>Operable</span>
            <span className="font-semibold">{breakdown.components.operable}</span>
          </li>
          <li className="flex items-center justify-between">
            <span>Hours</span>
            <span className="font-semibold">{breakdown.components.hours}</span>
          </li>
          <li className="flex items-center justify-between">
            <span>Price</span>
            <span className="font-semibold">{breakdown.components.price}</span>
          </li>
          <li className="flex items-center justify-between">
            <span>State</span>
            <span className="font-semibold">{breakdown.components.state}</span>
          </li>
        </ul>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Why this score</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {breakdown.rationale.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
