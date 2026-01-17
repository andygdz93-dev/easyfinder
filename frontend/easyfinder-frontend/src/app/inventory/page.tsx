"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/inventory")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading inventory…</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Inventory</h1>

      <table className="w-full border bg-white rounded">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Company</th>
            <th className="p-2 text-left">Industry</th>
            <th className="p-2 text-left">Location</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2">{i.company}</td>
              <td className="p-2">{i.industry}</td>
              <td className="p-2">{i.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
