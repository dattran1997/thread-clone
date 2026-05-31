// ─────────────────────────────────────────────
// Thread (Post) types
// ─────────────────────────────────────────────

import type { UserSummary } from "./user";

export type ThreadStatus    = "ACTIVE" | "DELETED" | "GHOST_ARCHIVED";
export type ReplyPermission = "EVERYONE" | "FOLLOWING" | "MENTIONED";
export type MediaType       = "IMAGE" | "VIDEO";

// ─── Sub-shapes ───

export interface ThreadMedia {
  id: string;
  url: string;
  type: MediaType;
  altText: string | null;
  order: number;
  width: number | null;
  height: number | null;
}

export interface PollOption {
  id: string;
  text: string;
  order: number;
  voteCount: number;
  hasVoted: boolean; // true if the current viewer voted for this option
}

export interface Poll {
  id: string;
  options: PollOption[];
  expiresAt: string;   // ISO 8601
  totalVotes: number;
  userVoteOptionId: string | null; // null if viewer has not voted
}

// ─── Main Thread shape ───

/** Full thread — returned by GET /threads/:id and embedded in feeds */
export interface Thread {
  id: string;
  author: UserSummary;
  text: string;
  parentId: string | null;   // null = root thread
  rootId: string | null;
  status: ThreadStatus;
  isGhost: boolean;
  ghostExpiresAt: string | null;
  replyPermission: ReplyPermission;
  requireApproval: boolean;
  isEdited: boolean;
  editableUntil: string | null;  // ISO 8601 — null after 15-min window
  scheduledAt: string | null;
  isDraft: boolean;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  quoteCount: number;
  viewCount: number;
  media: ThreadMedia[];
  poll: Poll | null;
  hashtags: string[];       // ["design", "ux"] — without #
  topics: string[];         // curated topic tags
  // Viewer-specific state (only when authenticated)
  isLiked: boolean;
  isReposted: boolean;
  isSaved: boolean;
  createdAt: string;        // ISO 8601
}

/** Thread with its reply chain — returned by GET /threads/:id */
export interface ThreadDetail extends Thread {
  replies: Thread[];
}

// ─── DTOs ───

export interface CreateThreadDto {
  text: string;
  parentId?: string;          // set to create a reply
  isGhost?: boolean;
  replyPermission?: ReplyPermission;
  requireApproval?: boolean;
  scheduledAt?: string;       // ISO 8601 — omit to publish immediately
  isDraft?: boolean;
  mediaIds?: string[];        // IDs of already-uploaded media objects (max 20)
  poll?: {
    options: string[];        // 2–4 option texts (max 25 chars each)
    expiresAt: string;        // ISO 8601
  };
  hashtags?: string[];
  topics?: string[];
}

export interface UpdateThreadDto {
  text?: string;              // only editable within 15-min window
  topics?: string[];
  hashtags?: string[];
}

export interface VotePollDto {
  optionId: string;
}
