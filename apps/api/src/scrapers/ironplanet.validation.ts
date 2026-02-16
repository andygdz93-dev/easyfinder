import { isIP } from "node:net";

export const isValidIronPlanetUrl = (input: unknown): input is string => {
  if (typeof input !== "string") return false;

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;

  const hostname = parsed.hostname.toLowerCase();
  if (isIP(hostname) !== 0) return false;

  return hostname === "ironplanet.com" || hostname.endsWith(".ironplanet.com");
};
