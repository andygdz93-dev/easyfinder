"use client";

export function SaveSearchButton({ filters }: { filters: any }) {
  async function save() {
    await fetch("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "My Search",
        filters,
      }),
    });
  }

  return (
    <button onClick={save} className="text-sm text-blue-600">
      Save Search
    </button>
  );
}
