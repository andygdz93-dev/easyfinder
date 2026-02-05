const readEnv = (key: string) => {
  const value = (import.meta as any).env?.[key] as string | undefined;
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const getApiUrl = (): string | null => {
  return readEnv("VITE_API_URL") ?? readEnv("VITE_API_BASE_URL");
};

export const requireApiUrl = (): string => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    throw new Error("VITE_API_URL is required");
  }
  return apiUrl.replace(/\/$/, "");
};
