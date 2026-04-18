const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7071/api";

const STORAGE_KEY = "quickaid_user";

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user?.email) {
          headers["X-User-Email"] = user.email;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  return headers;
}

async function parseError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => null);
  const message =
    body?.error || body?.message || `API error: ${res.status}`;
  const err = new Error(message) as Error & { status?: number };
  err.status = res.status;
  return err;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}
