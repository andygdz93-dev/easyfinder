// src/App.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { FaSpinner } from "react-icons/fa";

function App() {
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState("low");
  const [urgency, setUrgency] = useState("");
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const API_URL = import.meta.env.VITE_BACKEND_URL || "https://easyfinder-backend.fly.dev/api";

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/scores`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/score`, {
        budget: parseInt(budget),
        priority,
        urgency: parseInt(urgency),
      });
      setScore(res.data.score);
      setBudget("");
      setPriority("low");
      setUrgency("");
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert("Error calculating score.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">EasyFinder Demo</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 w-full max-w-md flex flex-col gap-4"
      >
        <h2 className="text-xl font-semibold">Calculate Your Score</h2>

        <label className="flex flex-col">
          Budget
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="border rounded px-3 py-2 mt-1"
            placeholder="Enter budget"
            required
          />
        </label>

        <label className="flex flex-col">
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="border rounded px-3 py-2 mt-1"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="flex flex-col">
          Urgency
          <input
            type="number"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="border rounded px-3 py-2 mt-1"
            placeholder="Enter urgency (1-10)"
            required
          />
        </label>

        <button
          type="submit"
          className="bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 flex justify-center items-center"
          disabled={loading}
        >
          {loading ? <FaSpinner className="animate-spin mr-2" /> : null}
          Calculate Score
        </button>

        {score !== null && (
          <div className="mt-4 bg-green-100 text-green-800 p-3 rounded font-semibold text-center">
            Score: {score}
          </div>
        )}
      </form>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Recent Scores</h2>
        {history.length === 0 && <p className="text-gray-500">No scores yet.</p>}
        <ul className="space-y-2">
          {history.map((item, idx) => (
            <li
              key={idx}
              className="bg-white shadow rounded p-3 flex justify-between items-center"
            >
              <span>
                Budget: ${item.budget}, Priority: {item.priority}, Urgency: {item.urgency}
              </span>
              <span className="font-bold text-blue-600">Score: {item.score}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
