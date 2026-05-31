"use client";

// ─────────────────────────────────────────────
// API client for the Threads Clone backend
// Base URL comes from NEXT_PUBLIC_API_URL env var
// All requests include the JWT access token from localStorage
// ─────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

/** Thin fetch wrapper that attaches auth header and parses JSON */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Read token from Zustand persisted store (key: "threads-auth")
  let token: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("threads-auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed?.state?.accessToken ?? null;
      }
    } catch {}
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? "Request failed");
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
