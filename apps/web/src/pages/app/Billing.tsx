import { Link, useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

export const Billing = () => {
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center px-4">
      <Card className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        {requestedRole === "enterprise" ? (
          <p className="mt-2 text-sm text-slate-400">
            Enterprise requires an active subscription and your account is not currently entitled.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">Manage your access and subscription options.</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/app/select-role">
            <Button variant="outline">Back to role selection</Button>
          </Link>
          <Link to="/app/listings">
            <Button>Go to listings</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
