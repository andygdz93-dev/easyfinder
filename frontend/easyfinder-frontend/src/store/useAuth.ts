import { create } from "zustand";

interface User {
  email: string;
  tier: "demo" | "nda" | "paid";
  scopes: string[];
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

const useAuth = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export default useAuth;
