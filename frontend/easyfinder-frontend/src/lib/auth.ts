import { apiFetch } from "./api";
import { useAuth } from "@/store/useAuth";

export async function loadMe() {
  try {
    const res = await apiFetch("/api/auth/me");
    if (!res.ok) throw new Error("Not authenticated");
    const user = await res.json();
    useAuth.getState().setUser(user);
  } catch {
    useAuth.getState().setUser(null);
  }
}
