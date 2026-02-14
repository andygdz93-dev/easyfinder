import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../lib/auth";
import { getMe } from "../lib/api";
import { Billing, isBillingActive } from "../lib/billing";
import { useRuntime } from "../lib/runtime";
import DemoBanner from "./DemoBanner";

const NDA_WARNING_TEXT = "NDA must be accepted before accessing this resource.";

function formatPlanLabel(billing?: {
  plan?: string;
  status?: string;
  promo?: { endsAt?: string } | null;
  promoActive?: boolean;
}) {
  const plan = billing?.plan ?? "free";
  const status = billing?.status ?? null;

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (plan === "free") return "Free";

  if (plan === "pro" && (billing?.promoActive || billing?.promo?.endsAt)) {
    return "Pro (promo)";
  }

  let label = cap(plan);
  if (status && status !== "active") label += ` (${status.replaceAll("_", " ")})`;
  return label;
}

const navSections = [
  {
    title: "Buyer",
    items: [
      { to: "/app/listings", label: "Listings" },
      { to: "/app/scoring", label: "Scoring" },
      { to: "/app/offers", label: "Offers" },
    ],
  },
  {
    title: "Seller",
    items: [
      { to: "/app/seller/dashboard", label: "Dashboard" },
      { to: "/app/seller/listings", label: "Listings" },
      { to: "/app/seller/inquiries", label: "Inquiries" },
      { to: "/app/seller/pipeline", label: "Pipeline" },
      { to: "/app/seller/add", label: "Add listing" },
      { to: "/app/seller/upload", label: "Upload listing" },
    ],
  },
  {
    title: "Enterprise",
    items: [{ to: "/app/settings", label: "Settings" }],
  },
  {
    title: "Upgrade",
    items: [{ to: "/app/upgrade", label: "Upgrade" }],
  },
];

export const AppShell = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { user, token, clearSession } = useAuth();
  const { demoMode, hydrated } = useRuntime();
  const isDemoMode = demoMode;
  const showDemoBanner = demoMode;
  const [billing, setBilling] = useState<Billing | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    let isActive = true;
    if (!token) {
      setBilling(null);
      setBillingError(null);
      setBillingLoading(false);
      return;
    }

    setBillingLoading(true);

    getMe()
      .then((data) => {
        if (!isActive) return;
        setBilling(data.billing ?? null);
        setBillingError(null);
      })
      .catch((error) => {
        if (!isActive) return;
        setBilling(null);
        setBillingError(error instanceof Error ? error.message : "Unable to load billing.");
      })
      .finally(() => {
        if (!isActive) return;
        setBillingLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [token]);

  const billingActive = isBillingActive(billing);
  const plan = billing?.plan ?? "free";
  const userRole = user?.role ?? null;
  const userRoleResolved =
  userRole === "enterprise"
    ? "enterprise"
    : userRole === "seller"
      ? "seller"
      : userRole === "buyer"
        ? "buyer"
        : "demo";

  const planResolved = plan === "enterprise" ? "enterprise" : plan === "pro" ? "pro" : "free";

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-role", userRoleResolved);
    root.setAttribute("data-plan", planResolved);

    return () => {
      root.removeAttribute("data-role");
      root.removeAttribute("data-plan");
    };
  }, [planResolved, userRoleResolved]);

  const planLabel = plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Enterprise";
  const roleLabel =
    userRole === "seller"
      ? "Seller"
      : userRole === "enterprise"
        ? "Enterprise"
        : userRole === "admin"
          ? "Admin"
          : userRole === "demo"
            ? "Demo"
            : userRole === null
              ? "Unselected"
              : "Buyer";
  const isShellLoading = !hydrated || billingLoading || (Boolean(token) && !user);
  const badgeLabel = isShellLoading ? "Loading…" : `${planLabel} ${roleLabel}`;
  const visibleSections = useMemo(() => {
    return navSections
      .map((section) => {
        if (section.title === "Seller" && demoMode) {
          return {
            ...section,
            items: section.items.filter(
              (item) => item.label !== "Add listing" && item.label !== "Upload listing"
            ),
          };
        }
        return section;
      })
      .filter((section) => {
        if (section.title === "Buyer") {
          return billingActive;
        }
        if (section.title === "Seller") {
          return (
            ((billingActive && (plan === "pro" || plan === "enterprise")) ||
              userRoleResolved === "seller") &&
            section.items.length > 0
          );
        }
        if (section.title === "Enterprise") {
          return billingActive && plan === "enterprise";
        }
        return true;
      });
  }, [billingActive, demoMode, plan, userRoleResolved]);


  return (
    <div
      className={`min-h-screen text-slate-100 ${className ?? ""}`}
      data-role={userRoleResolved}
      data-plan={planResolved}
    >
      <div className="flex">
        <aside className="min-h-screen w-64 border-r border-slate-800 bg-slate-900/70 px-6 py-8">
          <Link to="/" className="text-xl font-semibold text-white">
            Easy Finder AI
          </Link>
          <p className="mt-2 text-xs text-slate-400">Role: {roleLabel}</p>
          <p className="text-xs text-slate-400">
            Plan: {formatPlanLabel(billing ?? undefined)}
          </p>
          {billingError && billingError !== NDA_WARNING_TEXT ? (
            <p className="mt-2 text-xs text-rose-400">{billingError}</p>
          ) : null}
          {user?.ndaAccepted === false ? (
            <p className="mt-2 text-xs text-rose-400">
              {NDA_WARNING_TEXT}
            </p>
          ) : null}
          <nav className="mt-8 space-y-6">
            {visibleSections.map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {section.title}
                </p>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `block rounded-xl px-3 py-2 text-sm ${
                          isActive
                            ? "bg-[rgb(var(--accent)/0.2)] text-[rgb(var(--accent))]"
                            : "text-slate-400 hover:text-white"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          {user ? (
            <Button
              variant="outline"
              className="mt-8 w-full"
              onClick={() => clearSession()}
            >
              Log out
            </Button>
          ) : (
            <Link to="/login" className="mt-8 block">
              <Button className="w-full">Sign in</Button>
            </Link>
          )}
        </aside>
        <main className="flex-1">
          {showDemoBanner ? <DemoBanner /> : null}
          <header className="flex items-center justify-between border-b border-slate-800 px-8 py-6">
            <div>
              <h2 className="text-lg font-semibold">
                {user?.ndaAccepted ? "Welcome back" : "Welcome to Easy Finder AI"}
              </h2>
              <p className="text-sm text-slate-400">Premium equipment intelligence</p>
            </div>
            <div className="flex items-center gap-3">
              {isDemoMode ? (
                <button
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300"
                  onClick={() =>
                    document.documentElement.classList.toggle("dark")
                  }
                >
                  Switch Mode
                </button>
              ) : null}
              <div className="rounded-full border border-[rgb(var(--accent)/0.45)] px-4 py-2 text-xs text-[rgb(var(--accent))]">
                {badgeLabel}
              </div>
              <div className="rounded-full bg-slate-800 px-3 py-2 text-xs text-slate-200">
                {user?.email ?? "demo"}
              </div>
            </div>
          </header>
          <div className="px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
