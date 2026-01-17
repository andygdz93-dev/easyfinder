import { apiFetch } from "./api";

export async function loadMe() {
  const res = await apiFetch("/api/auth/me");
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}
