"use client";

import Link from "next/link";
import useAuth from "@/store/useAuth";

export default function Sidebar() {
  const { user, hasScope } = useAuth();

  return (
    <aside className="w-64 bg-white border-r p-4">
      <h2 className="text-xl font-semibold mb-6">EasyFinder</h2>

      <nav className="space-y-2">
        <Link href="/" className="block hover:text-blue-600">
          Dashboard
        </Link>

        {hasScope("inventory") && (
          <Link href="/inventory" className="block hover:text-blue-600">
            Inventory
          </Link>
        )}

        {!hasScope("paid") && (
          <Link
            href="/upgrade"
            className="block text-amber-600 hover:text-amber-700"
          >
            Upgrade
          </Link>
        )}
      </nav>

      {user && (
        <div className="mt-8 text-sm text-gray-500">
          Tier: <strong>{user.tier}</strong>
        </div>
      )}
    </aside>
  );
}
