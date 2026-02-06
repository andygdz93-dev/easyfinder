import { createContext, useContext, useMemo, useState } from "react";
import type { NdaStatus } from "./api";

type NdaContextValue = {
  status: NdaStatus | null;
  setStatus: (status: NdaStatus | null) => void;
};

const NdaContext = createContext<NdaContextValue | undefined>(undefined);

export const NdaProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<NdaStatus | null>(null);

  const value = useMemo(() => ({ status, setStatus }), [status]);

  return <NdaContext.Provider value={value}>{children}</NdaContext.Provider>;
};

export const useNda = () => {
  const context = useContext(NdaContext);
  if (!context) {
    throw new Error("useNda must be used within NdaProvider");
  }
  return context;
};
