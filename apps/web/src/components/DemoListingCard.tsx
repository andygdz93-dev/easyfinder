import { Listing } from "@easyfinderai/shared";
import { useNavigate } from "react-router-dom";
import { useDemoWatchlist } from "../lib/demoWatchlist";
import { formatCategory } from "../lib/formatters";

type Props = {
  listing: Listing;
};

export default function DemoListingCard({ listing }: Props) {
  const navigate = useNavigate();
  const watchlist = useDemoWatchlist();

  const image =
    (listing.images ?? [])[0] || listing.imageUrl || "/demo-images/other/1.jpg";
  const listingId = listing.id ?? "";
  const isSaved = listingId ? watchlist.isInWatchlist(listingId) : false;
  const displayPrice = listing.price ? `$${listing.price.toLocaleString()}` : "—";
  const displayHours = listing.hours ? `${listing.hours.toLocaleString()} hrs` : "—";

  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border bg-white shadow-sm">
      {/* IMAGE */}
      <div className="h-36 w-full overflow-hidden rounded-xl bg-slate-100 sm:h-40 md:h-44" data-testid="demo-card-hero">
        <img
          src={image}
          alt={listing.title ?? "Listing image"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* CONTENT */}
      <div className="space-y-2 p-4 md:p-5">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          {formatCategory(listing.category)}
        </div>

        <h3 className="text-base font-semibold leading-tight text-slate-900 md:text-lg">
          {listing.title ?? "Untitled listing"}
        </h3>

        <div className="text-sm text-gray-600">
          {displayPrice} · {displayHours} · {listing.state ?? "—"}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            className="rounded-md bg-black px-3 py-2 text-sm text-white"
            onClick={() => {
              if (!listingId) return;
              navigate(`/demo/listings/${listingId}`);
            }}
          >
            View Details
          </button>

          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => {
              if (!listingId) return;
              watchlist.toggle(listingId);
            }}
          >
            {isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
