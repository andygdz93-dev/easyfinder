import { useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function GeneratedOutreach() {
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");

  const generate = async () => {
    try {
      const res = await fetch(`${API}/generate-outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: input }),
      });
      const data = await res.json();
      setEmail(data.email);
    } catch {
      setEmail(`Subject: Equipment Availability – Confidential

Hi,

We’re reaching out because our system flagged your company as a strong buyer match based on recent equipment demand signals.

We currently have inventory that aligns with your operational profile. Access is NDA-gated.

Best,
EasyFinder AI`);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">AI-Generated Outreach</h2>

      <textarea
        placeholder="Buyer context / notes"
        className="border w-full p-2 mb-4 h-24"
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={generate}
        className="bg-blue-900 text-white px-4 py-2 rounded"
      >
        Generate Outreach
      </button>

      {email && (
        <pre className="mt-6 bg-gray-100 p-4 whitespace-pre-wrap rounded">
          {email}
        </pre>
      )}
    </div>
  );
}
