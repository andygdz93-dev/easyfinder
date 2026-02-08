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
  const [retryCount, setRetryCount] = useState(0);

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
  }, [token, isNdaRoute, status, isLoading, setStatus, retryCount]);

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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-sm">
        <p className="text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setRetryCount((prev) => prev + 1);
          }}
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status?.accepted) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/app/nda?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
};
