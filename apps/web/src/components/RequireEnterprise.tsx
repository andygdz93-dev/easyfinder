import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

const isEnterpriseUser = (role: string | undefined) => role === "admin";

export const RequireEnterprise = ({ children }: { children?: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!isEnterpriseUser(user?.role)) {
    return <Navigate to="/app/upgrade" replace state={{ from: location.pathname }} />;
  }

  return <>{children ?? <Outlet />}</>;
};
