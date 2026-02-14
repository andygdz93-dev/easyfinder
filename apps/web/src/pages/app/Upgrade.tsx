import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { activateProPromo, createCheckoutSession, getMe } from "../../lib/api";
import { Billing, isBillingActive } from "../../lib/billing";
import { useAuth } from "../../lib/auth";

type UpgradeState = "idle" | "loading" | "error";

export const Upgrade = () => {
  const { setUser, user } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [state, setState] = useState<UpgradeState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    getMe()
      .then((data) => {
        if (!isActive) return;
        setBilling(data.billing ?? null);
      })
      .catch((error) => {
        if (!isActive) return;
        setMessage(error instanceof Error ? error.message : "Unable to load billing.");
      });
    return () => {
      isActive = false;
    };
  }, []);

  const handleCheckout = async (plan: "pro" | "enterprise") => {
    setState("loading");
    setMessage(null);
    try {
      const { url } = await createCheckoutSession(plan);
      if (url) {
        window.location.assign(url);
        return;
      }
      setState("error");
      setMessage("No checkout URL returned.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setState("idle");
    }
  };

  const active = isBillingActive(billing);
  const plan = billing?.plan ?? "free";
  const periodEnd = billing?.current_period_end
    ? new Date(billing.current_period_end).toLocaleDateString()
    : "n/a";
  const isSeller = user?.role === "seller";
  const isPromoActive = billing?.promoActive === true;

  const handleSellerProUpgrade = async () => {
    setState("loading");
    setMessage(null);

    try {
      await activateProPromo();
      const updated = await getMe();
      setBilling(updated.billing ?? null);
      setUser({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        ndaAccepted: updated.ndaAccepted,
        ndaAcceptedAt: updated.ndaAcceptedAt,
      });
      navigate(-1);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to activate promo.");
    } finally {
      setState("idle");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Upgrade your access</h2>
        <p className="mt-2 text-sm text-slate-400">
          Manage your subscription and unlock production listings.
        </p>
        <div className={`mt-4 grid gap-4 ${isSeller ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          {!isSeller ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Current plan
              </p>
              <p className="mt-2 text-lg font-semibold capitalize">{plan}</p>
              <p className="mt-1 text-xs text-slate-400">
                Status: {billing?.status ?? "inactive"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Period end: {periodEnd}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                {active
                  ? "Your subscription is active."
                  : "Upgrade to access live listings."}
              </p>
            </div>
          ) : null}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
              {isSeller && isPromoActive ? "Pro (promo)" : "Pro"}
            </p>
            <h3 className="mt-2 text-lg font-semibold">
              {isSeller ? "Seller growth plan" : "Buyer + seller tools"}
            </h3>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-400">
              {isSeller ? (
                <>
                  <li>200 active listings</li>
                  <li>CSV upload</li>
                  <li>Seller insights</li>
                </>
              ) : (
                <>
                  <li>Up to 50 watchlist items</li>
                  <li>Live listings access</li>
                  <li>Seller insights</li>
                </>
              )}
            </ul>
            {isSeller ? (
              <p className="mt-3 text-xs text-slate-400">Free for the first 6 months after launch</p>
            ) : null}
            <Button
              className="mt-4 w-full"
              disabled={state === "loading"}
              onClick={() => (isSeller ? handleSellerProUpgrade() : handleCheckout("pro"))}
            >
              Upgrade to Pro
            </Button>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
              Enterprise
            </p>
            <h3 className="mt-2 text-lg font-semibold">Full access + sources</h3>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-400">
              {isSeller ? (
                <>
                  <li>Unlimited listings</li>
                  <li>Marketplace integrations</li>
                  <li>Full access + sources</li>
                </>
              ) : (
                <>
                  <li>Unlimited watchlist items</li>
                  <li>Source management access</li>
                  <li>Enterprise settings</li>
                </>
              )}
            </ul>
            <Button
              className="mt-4 w-full"
              variant="outline"
              disabled={state === "loading"}
              onClick={() =>
                isSeller ? navigate("/app/billing") : handleCheckout("enterprise")
              }
            >
              {isSeller ? "Go to billing" : "Upgrade to Enterprise"}
            </Button>
          </div>
        </div>
        {message ? <p className="mt-4 text-sm text-rose-400">{message}</p> : null}
      </Card>
    </div>
  );
};
