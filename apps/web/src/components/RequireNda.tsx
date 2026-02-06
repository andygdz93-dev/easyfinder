import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

const NDA_STORAGE_KEY = "easyfinder-nda-accepted";

const hasNdaAcceptance = () => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(NDA_STORAGE_KEY) === "true";
};

export const recordNdaAcceptance = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(NDA_STORAGE_KEY, "true");
};

export const RequireNda = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  if (hasNdaAcceptance()) {
    return <>{children}</>;
  }

  return <Navigate to="/nda" replace state={{ from: location.pathname }} />;
};
