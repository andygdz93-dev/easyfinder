import React, { useState } from "react";
import axios from "axios";
import { FaChartLine, FaClock, FaDollarSign } from "react-icons/fa";

export default function App() {
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState("medium");
  const [urgency, setUrgency] = useState("");
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post("/api/score", {
        budget: Number(budget),
        priority,
        urgency: Number(urgency),
      });
      setScore(response.data.score);
    } catch (error) {
      console.error(error);
      alert("Error calculating score");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start p-6">
      <header className="w-full max-w-2xl text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">EasyFinder</h1>
        <p className="text-gray-600">Instant lead scoring made simple</p>
      </header>

      <main className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Budget ($)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Urgency (1-10)
            </label>
            <input
              type="number"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              min={1}
              max={10}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            {loading ? "Calculating..." : "Get Score"}
          </button>
        </form>

        {score !== null && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded flex items-center space-x-3">
            <FaChartLine className="text-green-600 text-2xl" />
            <span className="text-green-800 font-semibold text-lg">
              Lead Score: {score}
            </span>
          </div>
        )}
      </main>

      <footer className="mt-10 text-gray-500 text-sm">
        © 2026 EasyFinder | Demo
      </footer>
    </div>
  );
}
