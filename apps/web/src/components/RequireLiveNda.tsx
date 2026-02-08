import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ApiError, buildApiUrl, getNdaStatus } from "../lib/api";
import type { NdaStatus } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNda } from "../lib/nda";
import { getApiBaseUrl } from "../env";

type RequireLiveNdaProps = {
  fetchNdaStatus?: () => Promise<NdaStatus>;
};

export const RequireLiveNda = ({ fetchNdaStatus = getNdaStatus }: RequireLiveNdaProps) => {
  const { token, clearSession } = useAuth();
  const { status, checked, setStatus, setChecked } = useNda();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const previousToken = useRef<string | null>(null);

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
    if (previousToken.current !== token) {
      previousToken.current = token ?? null;
      setChecked(false);
      setStatus(null);
      setError(null);
    }
  }, [token, setChecked, setStatus]);

  useEffect(() => {
    if (!token || isNdaRoute || checked || isLoading) {
      return;
    }

    let isSettled = false;
    const timeoutMs = 12000;
    const timeoutMessage = "Can't reach API.";
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const apiUrl = buildApiUrl("/nda/status", getApiBaseUrl());

    const fetchStatus = async () => {
      setIsLoading(true);
      setError(null);
      if (import.meta.env.DEV) {
        console.debug("[nda] checking status", {
          token: Boolean(token),
          route: location.pathname,
          checked,
          url: apiUrl,
        });
      }
      try {
        const data = await fetchNdaStatus();
        if (!isSettled) {
          setStatus(data);
          if (import.meta.env.DEV) {
            console.debug("[nda] status received", {
              accepted: Boolean(data?.accepted),
            });
          }
        }
      } catch (err) {
        if (!isSettled) {
          if (err instanceof ApiError && err.status === 401) {
            clearSession();
            return;
          }
          setError(err instanceof Error ? err.message : timeoutMessage);
          if (import.meta.env.DEV) {
            console.debug("[nda] status error", {
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }
      } finally {
        if (!isSettled) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          setIsLoading(false);
          setChecked(true);
        }
      }
    };

    timeoutId = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      setIsLoading(false);
      setChecked(true);
      setError(timeoutMessage);
      if (import.meta.env.DEV) {
        console.debug("[nda] status timeout", { timeoutMs });
      }
    }, timeoutMs);

    fetchStatus();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    token,
    isNdaRoute,
    checked,
    isLoading,
    setStatus,
    setChecked,
    retryCount,
    clearSession,
    location.pathname,
    fetchNdaStatus,
  ]);

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

  if (!checked) {
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
            setChecked(false);
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
