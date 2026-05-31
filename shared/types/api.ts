// ─────────────────────────────────────────────
// Common API response shapes
// Used by every list endpoint and error response
// ─────────────────────────────────────────────

/** Cursor-based paginated response — all list endpoints return this */
export interface Paginated<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** RFC 7807 error shape returned by the backend on failure */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
