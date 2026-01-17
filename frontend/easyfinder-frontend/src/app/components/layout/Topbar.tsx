"use client";

import { useAuth } from "@/store/useAuth";

export default function Topbar() {
  const { user, setUser } = useAuth();

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <div className="h-full px-6 flex items-center justify-between">
      <div className="text-sm text-slate-600">
        Enterprise Lead Intelligence
      </div>

      {user && (
        <div className="flex items-center gap-4">
          <span className="text-sm">{user.email}</span>

          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
            {user.tier.toUpperCase()}
          </span>

          <button
            onClick={logout}
            className="text-sm text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
