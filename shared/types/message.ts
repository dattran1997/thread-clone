// ─────────────────────────────────────────────
// Direct Message types
// ─────────────────────────────────────────────

import type { UserSummary } from "./user";

export interface DmMessage {
  id: string;
  conversationId: string;
  sender: UserSummary;
  text: string;
  createdAt: string;  // ISO 8601
}

export interface DmConversation {
  id: string;
  participant: UserSummary;   // the OTHER person (not the viewer)
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface SendMessageDto {
  text: string;
}

/** Pushed over WebSocket when a new DM arrives */
export interface DmMessageEvent {
  message: DmMessage;
  conversationId: string;
}
