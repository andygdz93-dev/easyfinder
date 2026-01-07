import React from "react";

export default function Header({ variant, setVariant }) {
  const variants = [
    "EasyFinder AI (Core)",
    "EasyFinder Heavy",
    "EasyFinder General",
    "EasyFinder Mall",
  ];

  return (
    <header className="bg-blue-900 text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">EasyFinder AI</h1>
      <div className="flex items-center gap-4">
        <select
          value={variant}
          onChange={(e) => setVariant(e.target.value)}
          className="text-black rounded px-2 py-1"
        >
          {variants.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
