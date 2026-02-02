import { Listing } from "@easyfinderai/shared";
import { useNavigate } from "react-router-dom";

type Props = {
  listing: Listing;
};

export default function DemoListingCard({ listing }: Props) {
  const navigate = useNavigate();

  const image =
    listing.imageUrl ||
    listing.images?.[0] ||
    "https://drive.google.com/file/d/121bNrBJoVlVCNj4XeDcikd9OdWr_gvkm/view?usp=drive_link";

  return (
    <div className="rounded-xl bg-white shadow-sm border overflow-hidden">
      {/* IMAGE */}
      <div className="h-48 w-full overflow-hidden bg-gray-100">
        <img
          src={image}
          alt={listing.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* CONTENT */}
      <div className="p-5 space-y-2">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          {listing.category}
        </div>

        <h3 className="font-semibold text-lg">{listing.title}</h3>

        <div className="text-sm text-gray-600">
          ${listing.price.toLocaleString()} · {listing.hours} hrs · {listing.state}
        </div>

        <div className="pt-3 flex gap-3">
          <button
            className="px-4 py-2 rounded-md bg-black text-white text-sm"
            onClick={() => navigate(`/demo/listings/${listing.id}`)}
          >
            View details
          </button>

          <button className="px-4 py-2 rounded-md border text-sm">
            Add to watchlist
          </button>
        </div>
      </div>
    </div>
  );
}
