"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { connectSocket, disconnectSocket } from "@/lib/ws";
import { api } from "@/lib/api";

/** Mount once inside root layout to wire up real-time events. */
export function WsProvider() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const incrementUnread = useNotificationStore((s) => s.incrementUnread);
  const incrementMessages = useNotificationStore((s) => s.incrementMessages);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const setUnreadMessages = useNotificationStore((s) => s.setUnreadMessages);

  // On login: fetch the true server-side counts so badge is correct from the first render
  useEffect(() => {
    if (!accessToken) return;

    // Notification bell badge
    api.get<{ count: number }>("/notifications/unread-count")
      .then((res) => setUnreadCount(res.count))
      .catch(() => {});

    // Messages badge — sum of unreadCount across all DM conversations
    api.get<{ count: number }>("/messages/unread-total")
      .then((res) => setUnreadMessages(res.count))
      .catch(() => {});
  }, [accessToken, setUnreadCount, setUnreadMessages]);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(accessToken);

    // Real-time notification — increment bell badge
    socket.on("notification", () => {
      incrementUnread();
    });

    // Real-time DM received via notifications namespace — increment messages badge
    socket.on("new-dm", () => {
      incrementMessages();
    });

    // Real-time thread count updates — forward to PostCards via window event
    socket.on("thread-updated", (data: { threadId: string; likeCount?: number; repostCount?: number; replyCount?: number }) => {
      window.dispatchEvent(new CustomEvent("thread-updated", { detail: data }));
    });

    // Real-time new reply — forward to ThreadDetailPage via window event
    socket.on("new-reply", (data: { threadId: string; reply: unknown }) => {
      window.dispatchEvent(new CustomEvent("thread-new-reply", { detail: data }));
    });

    // Backend deleted this device's session — force logout immediately
    socket.on("session_revoked", () => {
      clearAuth();
      router.replace("/login");
    });

    return () => {
      socket.off("notification");
      socket.off("new-dm");
      socket.off("thread-updated");
      socket.off("new-reply");
      socket.off("session_revoked");
    };
  }, [accessToken, incrementUnread, incrementMessages, clearAuth, router]);

  return null;
}
