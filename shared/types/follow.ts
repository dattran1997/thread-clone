// ─────────────────────────────────────────────
// Follow / Social Graph types
// ─────────────────────────────────────────────

import type { UserSummary } from "./user";

export type FollowStatus = "PENDING" | "ACCEPTED";

export interface FollowResponse {
  followingId: string;
  status: FollowStatus;
}

/** An entry in a followers or following list */
export interface FollowEntry extends UserSummary {
  followedAt: string;         // ISO 8601
  mutualFollowers: number;
}

/** A suggested user to follow */
export interface FollowSuggestion extends UserSummary {
  mutualFollowers: number;
  reason: string;             // e.g. "3 mutual followers"
}
