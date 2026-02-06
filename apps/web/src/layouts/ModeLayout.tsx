import { ReactNode } from "react";
import { Link } from "react-router-dom";

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
    label: "LIVE MODE",
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
  const config = modeConfig[mode];

  return (
    <div className={`min-h-screen ${config.shellClass}`}>
      <div
        className={`flex items-center justify-between border-b px-6 py-3 text-xs uppercase tracking-[0.3em] ${config.bannerClass}`}
      >
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${config.badgeClass}`}>
            {config.label}
          </span>
          <span className="text-[10px]">Experience separator enabled</span>
        </div>
        <Link to="/" className="text-[10px] font-semibold underline-offset-4 hover:underline">
          Switch mode
        </Link>
      </div>
      <div className="min-h-[calc(100vh-52px)]">{children}</div>
    </div>
  );
};
