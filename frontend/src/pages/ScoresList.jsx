import { useState, useEffect } from "react";

export default function Scores() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    fetch("/api/scores")
      .then((res) => res.json())
      .then((data) => setScores(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Past Scores</h2>
      {scores.length === 0 ? (
        <p className="text-gray-500">No scores yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">Budget</th>
              <th className="border px-2 py-1 text-left">Priority</th>
              <th className="border px-2 py-1 text-left">Urgency</th>
              <th className="border px-2 py-1 text-left">Score</th>
              <th className="border px-2 py-1 text-left">Created At</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s._id}>
                <td className="border px-2 py-1">{s.budget}</td>
                <td className="border px-2 py-1">{s.priority}</td>
                <td className="border px-2 py-1">{s.urgency}</td>
                <td className="border px-2 py-1">{s.score}</td>
                <td className="border px-2 py-1">
                  {new Date(s.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
