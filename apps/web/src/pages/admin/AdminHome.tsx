import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/card";
import { getAdminOverview } from "../../lib/api";

export default function AdminHome() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
  });

  if (isLoading) return <Card>Loading admin overview…</Card>;
  if (isError || !data) return <Card>Not authorized.</Card>;

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold">Listings</h2>
        <p>Active: {data.listings.active}</p>
        <p>Paused: {data.listings.paused}</p>
        <p>Removed: {data.listings.removed}</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Inquiries</h2>
        <p>Total: {data.inquiries.total}</p>
        <p>Open: {data.inquiries.open}</p>
        <p>Closed: {data.inquiries.closed}</p>
      </Card>
    </div>
  );
}
