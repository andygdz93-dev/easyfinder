function mustGet(key: string, fallback?: string) {
  const v = (import.meta as any).env?.[key] as string | undefined;
  if (v && v.trim()) return v.trim();
  if (fallback) return fallback;
  throw new Error(`Missing required env var: ${key}`);
}

export const env = {
  /**
   * Frontend Contract:
   * VITE_API_BASE_URL = https://easyfinder.fly.dev/api
   *
   * Local fallback:
   * http://localhost:8080/api
   */
  apiBaseUrl: mustGet("VITE_API_BASE_URL", "http://localhost:8080/api").replace(/\/$/, ""),
};
