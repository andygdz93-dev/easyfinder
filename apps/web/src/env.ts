const readEnv = (key: string) => {
  const fromImportMeta = (import.meta as any).env?.[key] as string | undefined;
  const fromProcess = (typeof process !== "undefined" ? process.env?.[key] : undefined) as
    | string
    | undefined;
  const value = fromImportMeta ?? fromProcess;
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const getApiBaseUrl = (): string => {
  const configured = readEnv("VITE_API_BASE_URL") ?? readEnv("VITE_API_URL");
  if (configured) return configured;
  const isProd = (import.meta as any).env?.PROD ?? (import.meta as any).env?.MODE === "production";
  return isProd ? "https://easyfinder.fly.dev" : "http://127.0.0.1:8080";
};

export const requireApiBaseUrl = (): string => {
  return getApiBaseUrl().replace(/\/$/, "");
};

// Backward-compatible aliases
export const getApiUrl = getApiBaseUrl;
export const requireApiUrl = requireApiBaseUrl;
