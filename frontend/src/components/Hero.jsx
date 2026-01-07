import React from "react";

export default function Hero({ variant }) {
  return (
    <section className="text-center py-20 bg-gray-100">
      <h2 className="text-4xl font-bold mb-4">Welcome to EasyFinder AI</h2>
      <p className="text-lg mb-6">
        Automatically find, score, and contact your best buyers.
      </p>
      <p className="text-blue-900 font-semibold mb-8">Variant: {variant}</p>
      <img
        src="https://img.icons8.com/ios-filled/150/1E3A8A/artificial-intelligence.png"
        alt="AI Illustration"
        className="mx-auto"
      />
    </section>
  );
}
