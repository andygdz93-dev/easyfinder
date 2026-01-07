import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function ScoresList() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    fetch(`${API}/scores`)
      .then((r) => r.json())
      .then(setScores)
      .catch(() =>
        setScores([
          { company: "Delta Equipment", score: 92, tier: "High" },
          { company: "IronWorks LLC", score: 71, tier: "Medium" },
          { company: "Budget Rentals", score: 45, tier: "Low" },
        ])
      );
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Prioritized Leads</h2>

      <table className="w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 border">Company</th>
            <th className="p-2 border">Score</th>
            <th className="p-2 border">Tier</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => (
            <tr key={i}>
              <td className="p-2 border">{s.company}</td>
              <td className="p-2 border">{s.score}</td>
              <td className="p-2 border">{s.tier}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
