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
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {/* IMAGE */}
      <div className="h-44 w-full overflow-hidden rounded-lg bg-slate-100 md:h-52">
        <img
          src={image}
          alt={listing.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* CONTENT */}
      <div className="space-y-2 p-4 md:p-5">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          {formatCategory(listing.category)}
        </div>

        <h3 className="font-semibold text-lg">{listing.title}</h3>

        <div className="text-sm text-gray-600">
          ${listing.price.toLocaleString()} · {listing.hours} hrs · {listing.state}
        </div>

        <div className="pt-3 flex gap-3">
          <button
            className="px-4 py-2 rounded-md bg-black text-white text-sm"
            onClick={() => navigate(`/demo/${listing.id}`)}
          >
            View Details
          </button>

          <button
            className="px-4 py-2 rounded-md border text-sm"
            onClick={() => watchlist.toggle(listing.id)}
          >
            {isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
