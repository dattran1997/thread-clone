"use client";
import { io, Socket } from "socket.io-client";

const BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";

// ── Notifications socket (/notifications namespace) ──────────────────────────
// Handles: notification events, thread-updated events, join-thread / leave-thread
let notifSocket: Socket | null = null;

export function connectSocket(token: string) {
  if (!notifSocket) {
    notifSocket = io(`${BASE_URL}/notifications`, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: false,
    });
  }
  notifSocket.auth = { token };
  if (!notifSocket.connected) notifSocket.connect();
  return notifSocket;
}

export function disconnectSocket() {
  notifSocket?.disconnect();
  notifSocket = null;
}

// ── Messages socket (/messages namespace) ────────────────────────────────────
// Handles: join-conversation, send-message, new-message
let msgSocket: Socket | null = null;

export function connectMessagesSocket(token: string) {
  if (!msgSocket) {
    msgSocket = io(`${BASE_URL}/messages`, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: false,
    });
  }
  msgSocket.auth = { token };
  if (!msgSocket.connected) msgSocket.connect();
  return msgSocket;
}

export function disconnectMessagesSocket() {
  msgSocket?.disconnect();
  msgSocket = null;
}
