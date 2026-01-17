"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import useAuth from "@/store/useAuth";

export default function RequireScope({
  scope,
  children,
}: {
  scope: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, hasScope } = useAuth();

  useEffect(() => {
    if (user && !hasScope(scope)) {
      router.replace("/upgrade");
    }
  }, [user, scope]);

  if (!user || !hasScope(scope)) return null;

  return <>{children}</>;
}
