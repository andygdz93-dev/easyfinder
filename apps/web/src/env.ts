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

export const getApiBaseUrl = (): string | null => {
  return readEnv("VITE_API_URL") ?? readEnv("VITE_API_BASE_URL");
};

export const requireApiBaseUrl = (): string => {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is required");
  }
  return apiBaseUrl.replace(/\/$/, "");
};

// Backward-compatible aliases
export const getApiUrl = getApiBaseUrl;
export const requireApiUrl = requireApiBaseUrl;
