"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { connectSocket, disconnectSocket } from "@/lib/ws";

/** Mount once inside root layout to wire up real-time events. */
export function WsProvider() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const incrementUnread = useNotificationStore((s) => s.incrementUnread);
  const incrementMessages = useNotificationStore((s) => s.incrementMessages);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(accessToken);

    // Real-time notification pushed from NotificationsGateway
    socket.on("notification", (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    });

    // Real-time DM pushed from MessagesGateway
    socket.on("new-message", () => {
      incrementMessages();
    });

    return () => {
      socket.off("notification");
      socket.off("new-message");
    };
  }, [accessToken, incrementUnread, incrementMessages, setUnreadCount]);

  return null;
}
