import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getNdaStatus } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNda } from "../lib/nda";
import { getApiBaseUrl } from "../env";

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
    const timeoutMs = 10000;
    const timeoutMessage = "Can't reach API.";
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });

    const fetchStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await Promise.race([getNdaStatus(), timeoutPromise]);
        if (isMounted) {
          setStatus(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : timeoutMessage);
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStatus();

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
    const isProduction = import.meta.env.PROD;
    const apiBaseUrl = getApiBaseUrl();
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-sm">
        <p className="text-red-500">{error}</p>
        {!isProduction ? (
          <p className="text-xs text-slate-400">API base URL: {apiBaseUrl}</p>
        ) : null}
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
