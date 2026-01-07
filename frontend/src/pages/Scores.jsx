import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Scores() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch scores from backend
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/scores");
        setScores(response.data);
      } catch (err) {
        setError("Failed to fetch scores");
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading scores...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Past Scores</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-4 py-2 border-b">Budget</th>
              <th className="px-4 py-2 border-b">Priority</th>
              <th className="px-4 py-2 border-b">Urgency</th>
              <th className="px-4 py-2 border-b">Score</th>
              <th className="px-4 py-2 border-b">Created At</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s._id} className="text-center hover:bg-gray-50">
                <td className="px-4 py-2 border-b">{s.budget}</td>
                <td className="px-4 py-2 border-b capitalize">{s.priority}</td>
                <td className="px-4 py-2 border-b">{s.urgency}</td>
                <td className="px-4 py-2 border-b font-bold">{s.score}</td>
                <td className="px-4 py-2 border-b">
                  {new Date(s.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
