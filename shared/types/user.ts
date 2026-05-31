// ─────────────────────────────────────────────
// User types
// ─────────────────────────────────────────────

export type UserRole = "USER" | "ADMIN";

/** Compact user shape — embedded in threads, notifications, DMs */
export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isFollowing?: boolean; // present when viewer is authenticated
}

/** Full public profile — returned by GET /users/:username */
export interface UserProfile extends UserSummary {
  bio: string | null;
  notes: string | null;
  isPrivate: boolean;
  links: string[];        // up to 5
  topics: string[];       // up to 10 topic tags
  followerCount: number;
  followingCount: number;
  threadCount: number;
  role: UserRole;
  createdAt: string;      // ISO 8601
}

/** Auth session — returned after login or register */
export interface AuthUser extends UserProfile {
  email: string;
  emailVerified: boolean;
}

// ─── DTOs (request bodies sent from frontend) ───

export interface RegisterDto {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  notes?: string;
  links?: string[];   // max 5
  topics?: string[];  // max 10
  isPrivate?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}
