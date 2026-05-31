// ─────────────────────────────────────────────
// Notification types
// ─────────────────────────────────────────────

import type { UserSummary } from "./user";

export type NotificationType =
  | "LIKE"
  | "FOLLOW"
  | "REPLY"
  | "REPOST"
  | "QUOTE"
  | "MENTION";

export interface Notification {
  id: string;
  type: NotificationType;
  actor: UserSummary;       // the user who triggered the notification
  entityId: string;         // threadId or userId
  entityType: "thread" | "user";
  /** Short preview text — e.g. the reply text or thread snippet */
  preview: string | null;
  isRead: boolean;
  createdAt: string;        // ISO 8601
}

/** Payload pushed over WebSocket for real-time delivery */
export interface NotificationEvent {
  notification: Notification;
  unreadCount: number;      // updated total after this notification
}
