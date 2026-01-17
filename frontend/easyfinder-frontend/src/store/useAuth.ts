import { create } from "zustand";

type User = {
  email: string;
  tier: "demo" | "nda" | "paid";
  scopes: string[];
};

type AuthState = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
}));
