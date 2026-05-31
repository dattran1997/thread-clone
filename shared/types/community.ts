// ─────────────────────────────────────────────
// Community (Loops) types
// ─────────────────────────────────────────────

import type { UserSummary } from "./user";

export type CommunityRole = "OWNER" | "MODERATOR" | "MEMBER";

export interface Community {
  id: string;
  name: string;
  slug: string;            // URL-safe identifier
  description: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  memberCount: number;
  postCount: number;
  isPublic: boolean;
  /** Viewer-specific */
  isMember: boolean;
  viewerRole: CommunityRole | null;
  createdAt: string;       // ISO 8601
}

export interface CommunityMember extends UserSummary {
  role: CommunityRole;
  joinedAt: string;        // ISO 8601
}

export interface CommunityFlair {
  id: string;
  label: string;
  color: string;           // hex
}

export interface LiveChatSession {
  id: string;
  communityId: string;
  name: string;
  photoUrl: string | null;
  startTime: string;       // ISO 8601
  endTime: string;         // ISO 8601
  isActive: boolean;
}

// ─── DTOs ───

export interface CreateCommunityDto {
  name: string;
  slug: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateCommunityDto {
  name?: string;
  description?: string;
  isPublic?: boolean;
}
