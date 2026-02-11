import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useRuntime } from "../lib/runtime";

type Mode = "demo" | "live";

const modeConfig: Record<
  Mode,
  { label: string; badgeClass: string; shellClass: string; bannerClass: string }
> = {
  demo: {
    label: "DEMO MODE",
    badgeClass: "bg-amber-300 text-amber-950",
    shellClass: "demo-shell",
    bannerClass: "border-amber-200/40 bg-amber-100/10 text-amber-100",
  },
  live: {
    label: "Loading…",
    badgeClass: "bg-sky-400 text-sky-950",
    shellClass: "live-shell",
    bannerClass: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  },
};

export const ModeLayout = ({
  mode,
  children,
}: {
  mode: Mode;
  children: ReactNode;
}) => {
  const { demoMode, hydrated, billingEnabled } = useRuntime();
  const { token, user } = useAuth();
  const config = modeConfig[mode];

  const roleLabel = user?.role === "seller" ? "Seller" : "Buyer";
  const planLabel = billingEnabled ? "Enterprise" : "Free";
  const isLoading = !hydrated || (!!token && !user);

  const liveBadgeLabel = isLoading ? "Loading…" : `${planLabel} ${roleLabel}`;
  const badgeLabel = mode === "demo" ? config.label : liveBadgeLabel;
  const badgeClass =
    mode === "demo"
      ? config.badgeClass
      : roleLabel === "Seller"
        ? "bg-emerald-400 text-emerald-950"
        : config.badgeClass;

  return (
    <div className={`min-h-screen ${config.shellClass}`}>
      <div
        className={`flex items-center justify-between border-b px-6 py-3 text-xs uppercase tracking-[0.3em] ${config.bannerClass}`}
      >
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>
        {demoMode ? (
          <Link to="/" className="text-[10px] font-semibold underline-offset-4 hover:underline">
            Switch mode
          </Link>
        ) : (
          <Link
            to="/app/upgrade"
            className="text-[10px] font-semibold underline-offset-4 hover:underline"
          >
            Upgrade
          </Link>
        )}
      </div>
      <div className="min-h-[calc(100vh-52px)]">{children}</div>
    </div>
  );
};
