// Client fetch helper for the learning API: JSON in, JSON out, errors thrown
// with the server's message so pages can show it.

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown; token?: string | null }): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) headers.set("Content-Type", "application/json");
  if (init?.token) headers.set("x-tausi-participant", init.token);
  const res = await fetch(url, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`, res.status, (data as { code?: string }).code);
  return data as T;
}

/** Guest participant tokens live on the device, one per session code. */
export const guestToken = {
  get(code: string): string | null {
    try { return localStorage.getItem(`tausi_live_${code}`); } catch { return null; }
  },
  set(code: string, token: string) {
    try { localStorage.setItem(`tausi_live_${code}`, token); } catch { /* private mode */ }
  },
};
