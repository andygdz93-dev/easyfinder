"use client";

import { useEffect } from "react";
import useAuth from "@/store/useAuth";
import { loadMe } from "@/lib/auth";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setUser = useAuth((s) => s.setUser);

  useEffect(() => {
    loadMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, [setUser]);

  return <>{children}</>;
}
