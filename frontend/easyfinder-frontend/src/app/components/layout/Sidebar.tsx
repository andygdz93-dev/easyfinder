"use client";

import Link from "next/link";
import useAuth from "@/store/useAuth";

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <nav className="h-full p-4 space-y-6">
      <div className="text-xl font-bold tracking-tight">
        EasyFinder AI
      </div>

      <div className="space-y-2 text-sm">
        <Link className="block hover:text-indigo-600" href="/">
          Dashboard
        </Link>

        {user?.scopes.includes("inventory") && (
          <Link className="block hover:text-indigo-600" href="/inventory">
            Inventory
          </Link>
        )}

        <Link className="block hover:text-indigo-600" href="/billing">
          Billing
        </Link>

        <Link className="block hover:text-indigo-600" href="/settings">
          Settings
        </Link>
      </div>

      <div className="pt-6 text-xs text-slate-400">
        Tier: {user?.tier ?? "guest"}
      </div>
    </nav>
  );
}
