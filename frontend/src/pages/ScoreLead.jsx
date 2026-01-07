import { useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function ScoreLead({ variant }) {
  const [form, setForm] = useState({
    company: "",
    contact: "",
    email: "",
    equipment: "",
    intent: "Medium",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/score-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, variant }),
      });

      const data = await res.json();
      setResult(data);
    } catch {
      // fallback demo score
      setResult({
        score: 87,
        tier: "High Intent",
        explanation: [
          "Buyer matches target equipment category",
          "Commercial email domain",
          "Clear purchase timeframe indicated",
        ],
      });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Lead Scoring</h2>

      {["company", "contact", "email", "equipment"].map((f) => (
        <input
          key={f}
          placeholder={f}
          className="border p-2 w-full mb-3"
          onChange={(e) => setForm({ ...form, [f]: e.target.value })}
        />
      ))}

      <select
        className="border p-2 w-full mb-4"
        onChange={(e) => setForm({ ...form, intent: e.target.value })}
      >
        <option>Low</option>
        <option>Medium</option>
        <option>High</option>
      </select>

      <button
        onClick={submit}
        disabled={loading}
        className="bg-blue-900 text-white px-4 py-2 rounded"
      >
        {loading ? "Scoring…" : "Score Lead"}
      </button>

      {result && (
        <div className="mt-6 bg-gray-100 p-4 rounded">
          <p><strong>Score:</strong> {result.score}</p>
          <p><strong>Tier:</strong> {result.tier}</p>
          <ul className="list-disc ml-5 mt-2">
            {result.explanation.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
