import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-gray-100">
        <Header />

        <main className="p-6 flex flex-col gap-6">
          {/* Score Form */}
          <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">Calculate a New Score</h1>
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
          <div id="scores">
            <Scores />
          </div>
        </main>
      </div>
    </div>
  );
}
