import { useParams, Link } from "react-router-dom";
import { demoListings } from "@EasyFinder/packages/shared/src";
import { assignDemoImages } from "@EasyFinder/packages/shared/src/demoImages";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function DemoListingDetail() {
  const { id } = useParams();
  const listing = demoListings.find((l) => l.id === id);

  if (!listing) {
    return (
      <Card className="p-6 text-sm text-rose-500">
        Unable to load listing details.
      </Card>
    );
  }

  const images =
    listing.images?.length
      ? listing.images
      : assignDemoImages({
          listingId: listing.id,
          category: listing.category,
          count: 5,
        });

  return (
    <div className="space-y-6">
      {images[0] ? (
        <img
          src={images[0]}
          alt={listing.title}
          className="w-full max-h-[420px] object-cover rounded-xl"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/demo-images/other/1.jpg";
          }}
        />
      ) : (
        <div className="rounded-xl bg-slate-100 p-10 text-slate-500">
          No images available.
        </div>
      )}

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.slice(1, 5).map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`${listing.title} ${idx + 1}`}
              className="h-28 w-full object-cover rounded-lg"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/demo-images/other/1.jpg";
              }}
            />
          ))}
        </div>
      )}

      <Card className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold">{listing.title}</h1>
        <p className="text-slate-500">{listing.description}</p>

        <div className="text-sm text-slate-600 flex gap-4">
          <span>${listing.price.toLocaleString()}</span>
          <span>{listing.hours.toLocaleString()} hrs</span>
          <span>{listing.state}</span>
          <span>{listing.category}</span>
        </div>

        <Link to="/demo">
          <Button variant="secondary">← Back to demo</Button>
        </Link>
      </Card>
    </div>
  );
}
