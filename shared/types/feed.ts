// ─────────────────────────────────────────────
// Feed types
// ─────────────────────────────────────────────

import type { Thread } from "./thread";
import type { Paginated } from "./api";

export type FeedType = "for-you" | "following";

/** Response from GET /feed/for-you and GET /feed/following */
export type FeedResponse = Paginated<Thread>;
