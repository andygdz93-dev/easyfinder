import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { recordNdaAcceptance } from "../components/RequireNda";

type NdaLocationState = {
  from?: string;
};

export const NdaGate = () => {
  const [accepted, setAccepted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const destination = useMemo(() => {
    const state = location.state as NdaLocationState | null;
    return state?.from ?? "/demo";
  }, [location.state]);

  const handleContinue = () => {
    recordNdaAcceptance();
    navigate(destination, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Access gate</p>
          <h1 className="text-3xl font-semibold">Non-Disclosure Agreement</h1>
          <p className="text-sm text-slate-300">
            Before entering the Easy Finder AI demo experience, please confirm that you agree to
            keep all data, product details, and workflows confidential.
          </p>
        </header>

        <Card className="space-y-4 border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold">NDA Summary</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>Do not share screenshots, recordings, or data outside your organization.</li>
            <li>Use the demo only for evaluation and feedback purposes.</li>
            <li>Respect proprietary scoring, workflows, and automation details.</li>
          </ul>
          <label className="flex items-start gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              className="mt-1"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            I agree to the Easy Finder AI NDA terms and understand that this demo is confidential.
          </label>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleContinue} disabled={!accepted}>
            Accept and continue
          </Button>
          <Link to="/" className="text-sm text-slate-300 hover:text-slate-100">
            Return to landing page
          </Link>
        </div>
      </div>
    </div>
  );
};
