import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/card";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";

type SellerListing = {
  id?: string;
  title?: string;
  state?: string;
  price?: number;
  year?: number;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
};

const formatCurrency = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

export const SellerListings = () => {
  const { token, user } = useAuth();

  const listingsQuery = useQuery({
    queryKey: ["seller-listings"],
    queryFn: () =>
      apiFetch<SellerListing[]>("/seller/listings", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: Boolean(token && user && user.role === "seller"),
  });

  const listings = useMemo(() => listingsQuery.data ?? [], [listingsQuery.data]);

  return (
    <Card>
      <h2 className="text-xl font-semibold">Seller listings</h2>
      <p className="mt-2 text-sm text-slate-400">Review your active inventory and listing performance.</p>

      {listingsQuery.isLoading ? (
        <p className="mt-4 text-sm text-slate-300">Loading listings…</p>
      ) : null}

      {listingsQuery.isError ? (
        <p className="mt-4 text-sm text-rose-300">Unable to load listings right now.</p>
      ) : null}

      {!listingsQuery.isLoading && !listingsQuery.isError ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">State</th>
                <th className="px-2 py-2">Year</th>
                <th className="px-2 py-2">Price</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-slate-400">
                    No seller listings yet.
                  </td>
                </tr>
              ) : (
                listings.map((listing, index) => (
                  <tr key={`${listing.id ?? "listing"}-${index}`} className="border-b border-slate-800">
                    <td className="px-2 py-3">{listing.title ?? "Untitled"}</td>
                    <td className="px-2 py-3">{listing.state ?? "—"}</td>
                    <td className="px-2 py-3">{listing.year ?? "—"}</td>
                    <td className="px-2 py-3">{formatCurrency(listing.price)}</td>
                    <td className="px-2 py-3 capitalize">{listing.status ?? "draft"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
};
