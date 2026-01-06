const API = import.meta.env.VITE_BACKEND_URL;

export async function healthCheck() {
  const res = await fetch(`${API}/api/health`);
  if (!res.ok) throw new Error("Health failed");
  return res.json();
}

export async function getScore(payload) {
  const res = await fetch(`${API}/api/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Score failed");
  return res.json();
}
