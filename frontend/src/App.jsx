import { useState, useEffect } from "react";
import Scores from "./pages/Scores";

export default function App() {
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState("Low");
  const [urgency, setUrgency] = useState("");
  const [scoreResult, setScoreResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { budget: parseInt(budget), priority, urgency: parseInt(urgency) };

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setScoreResult(data.score);
    } catch (err) {
      console.error(err);
      alert("Failed to calculate score.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">EasyFinder Demo</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Budget</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Urgency</label>
            <input
              type="number"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
          >
            Calculate Score
          </button>
        </form>

        {scoreResult !== null && (
          <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded">
            <strong>Score:</strong> {scoreResult}
          </div>
        )}
      </div>

      {/* Scores List */}
      <Scores />
    </div>
  );
}
