"use client";

// ─────────────────────────────────────────────
// API client — Threads Clone
// Auto-refreshes the access token on 401 (token expired).
// Concurrent 401s are queued so only one refresh call is made.
// ─────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

// ── Token helpers ────────────────────────────────────────────────────────────

function getStoredAuth(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
  try {
    const raw = localStorage.getItem("threads-auth");
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed?.state?.accessToken ?? null,
      refreshToken: parsed?.state?.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function updateStoredTokens(accessToken: string, refreshToken: string) {
  try {
    const raw = localStorage.getItem("threads-auth");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state.accessToken = accessToken;
    parsed.state.refreshToken = refreshToken;
    localStorage.setItem("threads-auth", JSON.stringify(parsed));
  } catch {}
}

function clearStoredAuth() {
  try {
    localStorage.removeItem("threads-auth");
  } catch {}
}

// ── Refresh logic (with queue to prevent duplicate calls) ────────────────────

let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

async function executeRefresh(): Promise<string | null> {
  const { refreshToken } = getStoredAuth();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data: { accessToken: string; refreshToken: string } = await res.json();
    updateStoredTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    // Another request is already refreshing — wait for it
    return new Promise<string | null>((resolve) => {
      refreshWaiters.push(resolve);
    });
  }

  isRefreshing = true;
  const newToken = await executeRefresh();
  isRefreshing = false;

  // Resolve all queued requests with the new token (or null on failure)
  refreshWaiters.forEach((resolve) => resolve(newToken));
  refreshWaiters = [];

  return newToken;
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const { accessToken } = getStoredAuth();

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  // ── 401: attempt token refresh then retry once ───────────────────────────
  if (res.status === 401 && !_isRetry) {
    // Don't try to refresh auth endpoints — would cause infinite loop
    if (path.startsWith("/auth/")) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(body.message ?? "Unauthorized");
    }

    const newToken = await refreshAccessToken();

    if (!newToken) {
      // Refresh failed → clear session and send to login
      clearStoredAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please log in again.");
    }

    // Retry the original request with the fresh token
    return request<T>(path, options, true);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? "Request failed");
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Public API surface ───────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** Multipart file upload — do NOT set Content-Type (browser sets it with boundary) */
  upload: <T>(path: string, form: FormData) => {
    const { accessToken } = getStoredAuth();
    return fetch(`${BASE}${path}`, {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(body.message ?? "Upload failed");
      }
      return res.json() as Promise<T>;
    });
  },
};
