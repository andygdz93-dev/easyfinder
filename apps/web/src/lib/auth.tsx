import { createContext, useContext, useMemo, useState } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: "demo" | "buyer" | "seller" | "admin";
};

type Session = {
  token: string;
  user: User;
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
};

export const AUTH_SESSION_STORAGE_KEY = "easyfinder_auth_session";

const readStoredSession = (): Session | null => {
  const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Session;
  } catch {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  }
};

const writeStoredSession = (session: Session | null) => {
  if (!session) {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    // cleanup old keys from previous storage format
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return;
  }

  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  // cleanup old keys from previous storage format
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getStoredAuthToken = (): string | null => {
  const session = readStoredSession();
  return session?.token ?? null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSessionState] = useState<Session | null>(() => readStoredSession());

  const value = useMemo(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      setSession: (newToken: string, newUser: User) => {
        const nextSession = { token: newToken, user: newUser };
        setSessionState(nextSession);
        writeStoredSession(nextSession);
      },
      clearSession: () => {
        setSessionState(null);
        writeStoredSession(null);
      },
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
