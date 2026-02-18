import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import ImageGallery from "../../components/ImageGallery";
import {
  ApiError,
  addToWatchlist,
  createInquiry,
  removeFromWatchlist,
  getListing,
  getRequestId,
  getWatchlist,
} from "../../lib/api";
import { WatchlistItem } from "@easyfinderai/shared";
import { useAuth } from "../../lib/auth";
import { useRuntime } from "../../lib/runtime";
import { formatListingHours, formatListingPrice, toPlainText } from "../../lib/formatters";

export const ListingDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const runtime = useRuntime();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  const listingQuery = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListing(id ?? ""),
    enabled: Boolean(id),
  });

  const watchlistQuery = useQuery({
    queryKey: ["watchlist"],
    queryFn: () => getWatchlist(),
  });

  const watchlistIds = new Set(
    (watchlistQuery.data?.items ?? []).map((item: WatchlistItem) => item.listingId)
  );

  if (listingQuery.isLoading) {
    return <p className="text-sm text-slate-400">Loading listing...</p>;
  }

  if (listingQuery.isError) {
    if (listingQuery.error instanceof ApiError) {
      if (listingQuery.error.message.toLowerCase().includes("not found")) {
        return <p className="text-sm text-slate-400">Listing not found.</p>;
      }
    }
    return (
      <Card className="border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
        Could not load listing.
        {getRequestId(listingQuery.error) && (
          <span className="ml-2 text-xs text-rose-200">
            Request ID: {getRequestId(listingQuery.error)}
          </span>
        )}
      </Card>
    );
  }

  const data = listingQuery.data;
  if (!data) {
    return <p className="text-sm text-slate-400">Listing not found.</p>;
  }

  const handleWatchlist = async () => {
    if (!id) return;
    setActionError(null);
    try {
      if (watchlistIds.has(id)) {
        await removeFromWatchlist(id);
      } else {
        await addToWatchlist(id);
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

  const images = data.images?.length
    ? data.images
    : data.imageUrl
    ? [data.imageUrl]
    : [];
  const displayPrice = formatListingPrice(data.price);
  const displayHours = formatListingHours(data.hours);
  const score = data.score;
  const scores = score?.breakdown ?? {};
  const rationale = score?.reasons ?? [];
  const listingId = data.id ?? "";
  const isSellerListing = data.source?.startsWith("seller:");
  const canRequestInfo = !runtime.demoMode && (user?.role === "buyer" || user?.role === "admin");

  const handleSubmitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !inquiryMessage.trim()) return;
    setInquiryError(null);
    setIsSubmittingInquiry(true);
    try {
      await createInquiry({ listingId: id, message: inquiryMessage.trim() });
      setInquirySuccess(true);
      setIsRequestModalOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === "INQUIRY_EXISTS") {
        setInquiryError("You already requested info for this listing.");
      } else {
        setInquiryError("Unable to send request right now.");
      }
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{data.title}</h2>
            <Badge className="mt-1">
              {isSellerListing ? "Seller Listing" : "External Listing"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {canRequestInfo && (
              inquirySuccess ? (
                <Button variant="secondary" disabled>
                  Request sent
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setIsRequestModalOpen(true)}>
                  Request Info
                </Button>
              )
            )}
            <Badge
              className="bg-accent text-slate-900"
              title={`Confidence ${((score?.confidence ?? 0) * 100).toFixed(0)}%`}
            >
              Score {score?.total ?? data.totalScore ?? 0}
            </Badge>
          </div>
        </div>

        {images.length > 0 && (
          <ImageGallery
            images={images}
            alt={data.title ?? "Listing image"}
            maxThumbs={4}
            imagesKey={data.id ?? data.title}
            heroClassName="h-72 rounded-lg"
            thumbClassName="h-20 rounded-md"
          />
        )}

        <p className="text-sm text-slate-300">{toPlainText(data.description)}</p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <span>{displayPrice}</span>
          {displayHours && <span>{displayHours}</span>}
          <span>{data.state ?? "—"}</span>
          <span>{data.category ?? "—"}</span>
          <span>{data.source ?? "—"}</span>
        </div>
        <div>
          <Button
            variant="secondary"
            onClick={handleWatchlist}
          >
            {listingId && watchlistIds.has(listingId)
              ? "Remove from watchlist"
              : "Add to watchlist"}
          </Button>
        </div>
        {actionError && <div className="text-xs text-rose-200">{actionError}</div>}
        {inquirySuccess && (
          <div className="text-xs text-emerald-200">
            Request sent. EasyFinder will route your inquiry.
          </div>
        )}
        {inquiryError && <div className="text-xs text-rose-200">{inquiryError}</div>}

        <div className="grid gap-3 text-xs text-slate-300">
          {Object.entries(scores).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="capitalize">{key}</span>
              <span>{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <span className="capitalize">Confidence</span>
            <span>{((score?.confidence ?? 0) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </Card>
      <Card className="space-y-3">
        <h3 className="text-lg font-semibold">Score explanation</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          {rationale.map((item, index) => (
            <li key={`${index}-${typeof item === "string" ? item : item.message}`}>- {typeof item === "string" ? item : item.message}</li>
          ))}
        </ul>
      </Card>

      {isRequestModalOpen && canRequestInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h3 className="text-lg font-semibold">Request Info</h3>
            <form className="mt-3 space-y-3" onSubmit={handleSubmitInquiry}>
              <textarea
                className="min-h-28 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100"
                value={inquiryMessage}
                onChange={(event) => setInquiryMessage(event.target.value)}
                required
                maxLength={2000}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequestModalOpen(false)}
                  disabled={isSubmittingInquiry}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingInquiry || !inquiryMessage.trim()}>
                  {isSubmittingInquiry ? "Sending..." : "Submit"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
