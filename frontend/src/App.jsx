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
              className="w-full border
