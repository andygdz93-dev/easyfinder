import { create } from "zustand";

export type User = {
  email: string;
  tier: "demo" | "nda" | "paid";
  scopes: string[];
};

type AuthState = {
  user: User | null;
  setUser: (user: User | null) => void;
  hasScope: (scope: string) => boolean;
};

const useAuth = create<AuthState>((set, get) => ({
  user: null,

  setUser: (user) => set({ user }),

  hasScope: (scope) => {
    const user = get().user;
    return user?.scopes?.includes(scope) ?? false;
  },
}));

export default useAuth;
