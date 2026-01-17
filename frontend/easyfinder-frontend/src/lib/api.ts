export async function apiFetch(
  input: RequestInfo,
  init?: RequestInit
) {
  const res = await fetch(input, {
    credentials: "include",
    ...init,
  });

  if (res.status === 401) {
    const refresh = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (refresh.ok) {
      return fetch(input, {
        credentials: "include",
        ...init,
      });
    }
  }

  return res;
}
