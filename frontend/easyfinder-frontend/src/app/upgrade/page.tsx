"use client";

import useAuth from "@/store/useAuth";

export default function UpgradePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Upgrade your plan</h1>

      <p className="text-gray-600 mb-6">
        You are currently on the <strong>{user?.tier}</strong> plan.
      </p>

      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h2 className="text-lg font-medium mb-2">Paid Plan</h2>
        <p className="text-sm text-gray-500 mb-4">
          Full inventory access, exports, and priority data.
        </p>

        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Upgrade (Stripe)
        </button>
      </div>
    </div>
  );
}
