import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ApiError, getNdaStatus } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNda } from "../lib/nda";
import { getApiBaseUrl } from "../env";

export const RequireLiveNda = () => {
  const { token, clearSession } = useAuth();
  const { status, setStatus } = useNda();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);

  const isNdaRoute = useMemo(
    () => location.pathname === "/app/nda",
    [location.pathname]
  );

  const nextPath = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search]
  );

  const isAccepted = useMemo(() => {
    if (!status || typeof status !== "object") return false;
    const record = status as Record<string, unknown>;
    const directValue =
      record.accepted ??
      record.isAccepted ??
      record.signed ??
      (record.status === "accepted");
    if (typeof directValue === "boolean") return directValue;
    if (directValue === "accepted") return true;
    const nested = (record.data as Record<string, unknown> | undefined) ?? {};
    const nestedValue =
      nested.accepted ??
      nested.isAccepted ??
      nested.signed ??
      (nested.status === "accepted");
    if (typeof nestedValue === "boolean") return nestedValue;
    if (nestedValue === "accepted") return true;
    return false;
  }, [status]);

  useEffect(() => {
    if (!token || isNdaRoute || hasChecked || isLoading) {
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
      setHasChecked(false);
      try {
        const data = await Promise.race([getNdaStatus(), timeoutPromise]);
        if (isMounted) {
          setStatus(data);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError && err.status === 401) {
            clearSession();
            return;
          }
          setError(err instanceof Error ? err.message : timeoutMessage);
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (isMounted) {
          setIsLoading(false);
          setHasChecked(true);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [token, isNdaRoute, hasChecked, isLoading, setStatus, retryCount, clearSession]);

  if (!token) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(nextPath)}`}
        replace
      />
    );
  }

  if (isNdaRoute) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Checking NDA status...
      </div>
    );
  }

  if (!hasChecked) {
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
            setHasChecked(false);
            setStatus(null);
            setRetryCount((prev) => prev + 1);
          }}
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isAccepted) {
    return <Navigate to={`/app/nda?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  return <Outlet />;
};
