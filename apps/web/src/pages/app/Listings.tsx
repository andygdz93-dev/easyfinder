import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  ListingWithScore,
  addToWatchlist,
  removeFromWatchlist,
  getListings,
  getRequestId,
  getWatchlist,
} from "../../lib/api";
import { WatchlistItem } from "@easyfinderai/shared";

export const Listings = () => {
  const [state, setState] = useState("");
  const [maxHours, setMaxHours] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [operableOnly, setOperableOnly] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const listingsQuery = useQuery<ListingWithScore[]>({
    queryKey: ["listings", state, maxHours, maxPrice, operableOnly],
    queryFn: () =>
      getListings({
        state: state || undefined,
        maxHours: maxHours ? Number(maxHours) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        operable: operableOnly,
      }),
  });

  const watchlistQuery = useQuery<{ items: WatchlistItem[] }>({
    queryKey: ["watchlist"],
    queryFn: () => getWatchlist(),
  });

  const watchlistIds = useMemo(() => {
    const items = watchlistQuery.data?.items ?? [];
    return new Set(items.map((item: WatchlistItem) => item.listingId));
  }, [watchlistQuery.data]);

  const handleToggleWatchlist = async (listingId: string) => {
    setActionError(null);
    try {
      if (watchlistIds.has(listingId)) {
        await removeFromWatchlist(listingId);
      } else {
        await addToWatchlist(listingId);
      }
      await watchlistQuery.refetch();
    } catch (error) {
      const requestId = getRequestId(error);
      setActionError(
        requestId
          ? `Could not update watchlist. Request ID: ${requestId}`
          : "Could not update watchlist."
      );
    }
  };

  const data = listingsQuery.data;
  const listings = Array.isArray(data) ? data : [];
  const hasInvalidData = data !== undefined && !Array.isArray(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm"
          value={state}
          onChange={(event) => setState(event.target.value)}
        >
          <option value="">All states</option>
          <option value="CA">CA</option>
          <option value="AZ">AZ</option>
          <option value="TX">TX</option>
          <option value="IA">IA</option>
        </select>
        <Input
          type="number"
          min="0"
          placeholder="Max hours"
          value={maxHours}
          onChange={(event) => setMaxHours(event.target.value)}
        />
        <Input
          type="number"
          min="0"
          placeholder="Max price"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
        />
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={operableOnly}
            onChange={(event) => setOperableOnly(event.target.checked)}
          />
          Operable only
        </label>
      </div>

      {actionError && (
        <Card className="border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {actionError}
        </Card>
      )}
      {listingsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="h-40 animate-pulse" />
          ))}
        </div>
      ) : listingsQuery.isError || hasInvalidData ? (
        <Card className="border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
          Live listings are not available in DEMO_MODE.
        </Card>
      ) : listings.length === 0 ? (
        <Card className="border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
          No live listings available yet. Once ingestion starts, they will appear here.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((listing) => {
            const listingId = listing.id ?? "";
            return (
            <Card key={listingId || listing.title || "listing"} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{listing.title}</h3>
                  <p className="text-xs text-slate-400">{listing.source}</p>
                </div>
                <Badge className="bg-accent text-slate-900">{listing.totalScore}</Badge>
              </div>
              <img
                src={(listing.images ?? [])[0] || listing.imageUrl || "/demo-images/other/1.jpg"}
                alt={listing.title}
                className="h-40 w-full rounded-lg object-cover"
              />
              <p className="text-sm text-slate-300">{listing.description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span>
                  {listing.price ? `$${listing.price.toLocaleString()}` : "—"}
                </span>
                <span>
                  {listing.hours ? `${listing.hours.toLocaleString()} hrs` : "—"}
                </span>
                <span>{listing.state ?? "—"}</span>
                <span>
                  {listing.operable === undefined
                    ? "—"
                    : listing.operable
                    ? "Operable"
                    : "Not operable"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to={`/app/listings/${listingId}`}>
                  <Button variant="secondary">View details</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!listingId) return;
                    handleToggleWatchlist(listingId);
                  }}
                  disabled={watchlistQuery.isLoading}
                >
                  {listingId && watchlistIds.has(listingId)
                    ? "Remove from watchlist"
                    : "Add to watchlist"}
                </Button>
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
