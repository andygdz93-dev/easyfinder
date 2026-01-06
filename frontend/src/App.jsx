import { useEffect, useState } from "react";
import { healthCheck, getScore } from "./lib/api";

export default function App() {
  const [status, setStatus] = useState("Checking backend...");
  const [score, setScore] = useState(null);

  useEffect(() => {
    healthCheck()
      .then(d => setStatus(`Backend: ${d.status}`))
      .catch(() => setStatus("Backend unreachable"));
  }, []);

  async function handleClick() {
    const result = await getScore({
      budget: 6000,
      priority: "high",
      urgency: 9,
    });
    setScore(result.total);
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>EasyFinder</h1>
      <p>{status}</p>

      <button onClick={handleClick}>
        Get Score
      </button>

      {score !== null && <p>Score: {score}</p>}
    </div>
  );
}
