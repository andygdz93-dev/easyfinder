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

  const image = listing.images[0] || listing.imageUrl || "/demo-images/other/1.jpg";
  const isSaved = watchlist.isInWatchlist(listing.id);

  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border bg-white shadow-sm">
      {/* IMAGE */}
      <div className="h-36 w-full overflow-hidden rounded-xl bg-slate-100 sm:h-40 md:h-44" data-testid="demo-card-hero">
        <img src={image} alt={listing.title} className="h-full w-full object-cover" loading="lazy" />
      </div>

      {/* CONTENT */}
      <div className="space-y-2 p-4 md:p-5">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          {formatCategory(listing.category)}
        </div>

        <h3 className="text-base font-semibold leading-tight text-slate-900 md:text-lg">{listing.title}</h3>

        <div className="text-sm text-gray-600">
          ${listing.price.toLocaleString()} · {listing.hours} hrs · {listing.state}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            className="rounded-md bg-black px-3 py-2 text-sm text-white"
            onClick={() => navigate(`/demo/${listing.id}`)}
          >
            View Details
          </button>

          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => watchlist.toggle(listing.id)}
          >
            {isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
