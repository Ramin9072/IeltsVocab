export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

/** JSON fetch helper. Throws ApiError with the server's error code so the UI can show a translated message. */
export async function apiFetch<T = unknown>(path: string, init?: Omit<RequestInit, "body"> & { json?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { ...(init?.json !== undefined ? { "content-type": "application/json" } : {}), ...init?.headers },
      body: init?.json !== undefined ? JSON.stringify(init.json) : undefined,
    });
  } catch {
    throw new ApiError("network", "Network error", 0);
  }
  if (res.status === 401) {
    window.location.replace("/login");
    throw new ApiError("unauthorized", "Signed out", 401);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(e?.code ?? "generic", e?.message ?? "Request failed", res.status, e?.details);
  }
  return data as T;
}
