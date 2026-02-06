import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getNdaStatus } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNda } from "../lib/nda";

export const RequireLiveNda = () => {
  const { token } = useAuth();
  const { status, setStatus } = useNda();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNdaRoute = useMemo(
    () => location.pathname === "/app/nda",
    [location.pathname]
  );

  useEffect(() => {
    if (!token || isNdaRoute || status || isLoading) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getNdaStatus()
      .then((data) => {
        if (isMounted) {
          setStatus(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to check NDA status.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, isNdaRoute, status, isLoading, setStatus]);

  if (!token || isNdaRoute) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Checking NDA status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  if (!status?.accepted) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/app/nda?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
};
