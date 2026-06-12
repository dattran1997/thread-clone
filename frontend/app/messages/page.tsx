"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Avatar } from "@/components/ui/Avatar";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { cn, relativeTime } from "@/lib/utils";
import { ChevronLeft, Send } from "lucide-react";
import { connectMessagesSocket, disconnectMessagesSocket } from "@/lib/ws";

// Matches the shape returned by GET /messages (getConversations)
interface Conversation {
  conversationId: string;
  participant: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
  lastMessage: { id: string; text: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

// Matches the shape returned by GET /messages/:id (getMessages) and new-message socket event
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  text: string;
  createdAt: string;
}

// Shape returned by POST /messages/start
interface StartConversationResponse {
  id: string;
  updatedAt: string;
  participants: { userId: string; user: { id: string; username: string; displayName: string; avatarUrl: string | null } }[];
}

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Ref so the socket handler always sees the current conversation without stale closure
  const activeConvRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // Load conversation list, then handle ?user= deep-link
  useEffect(() => {
    if (!user) return;
    const recipientId = searchParams.get("user");

    api.get<{ data: Conversation[] }>("/messages")
      .then(async (r) => {
        setConversations(r.data);

        if (recipientId) {
          // ?user=<userId> — start or open a conversation with that user
          try {
            const res = await api.post<StartConversationResponse>("/messages/start", { recipientId });
            const other = res.participants.find((p) => p.userId !== user.id);
            const conv: Conversation = {
              conversationId: res.id,
              participant: other?.user ?? null,
              lastMessage: null,
              unreadCount: 0,
              updatedAt: res.updatedAt,
            };
            // Add to list if it isn't already there
            setConversations((prev) =>
              prev.some((c) => c.conversationId === res.id) ? prev : [conv, ...prev],
            );
            // Open the chat immediately
            openConversation(conv);
          } catch {}
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Connect to /messages namespace and listen for real-time messages
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectMessagesSocket(accessToken);

    const handleNewMessage = (msg: Message) => {
      // Append to chat view if this conversation is open
      if (activeConvRef.current?.conversationId === msg.conversationId) {
        setMessages((prev) => {
          // Skip if we already have this message (dedup by id)
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }

      // Update last message preview in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === msg.conversationId
            ? { ...c, lastMessage: { id: msg.id, text: msg.text, senderId: msg.senderId, createdAt: msg.createdAt } }
            : c,
        ),
      );
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
      disconnectMessagesSocket();
    };
  }, [accessToken]);

  async function openConversation(conv: Conversation) {
    setActiveConv(conv);
    activeConvRef.current = conv;

    // Join the socket room so we receive new-message events for this conversation
    if (accessToken) {
      const socket = connectMessagesSocket(accessToken);
      socket.emit("join-conversation", { conversationId: conv.conversationId });
    }

    // Fetch message history (API returns newest-first → reverse for chat order)
    const res = await api.get<{ data: Message[] }>(`/messages/${conv.conversationId}`);
    setMessages(res.data.slice().reverse());
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function sendMessage() {
    if (!text.trim() || !activeConv || !accessToken) return;
    const socket = connectMessagesSocket(accessToken);
    // Send via WebSocket — the gateway saves to DB and broadcasts new-message to the room
    // (including back to the sender, so no optimistic add needed)
    socket.emit("send-message", {
      conversationId: activeConv.conversationId,
      text: text.trim(),
    });
    setText("");
  }

  // Show nothing until Zustand has read from localStorage — prevents flash of "Please log in"
  if (!hasHydrated) {
    return <div className="flex min-h-screen bg-background" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <p className="text-muted-foreground">Please log in to see messages</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <div className="flex w-full max-w-[900px] border-r border-border min-h-screen">
        {/* Conversation list */}
        <div className={cn(
          "flex flex-col border-r border-border",
          activeConv ? "hidden lg:flex w-[340px]" : "flex-1 lg:w-[340px] lg:flex-none",
        )}>
          <div className="sticky top-0 px-4 py-4 border-b border-border bg-background/90 backdrop-blur-xl">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
          </div>

          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No conversations yet</div>
          ) : (
            conversations.map((conv) => (
              <button key={conv.conversationId} onClick={() => openConversation(conv)}
                className={cn(
                  "flex items-center gap-3 px-4 py-4 border-b border-border hover:bg-foreground/5 transition-colors text-left w-full",
                  conv.unreadCount > 0 && "bg-foreground/5",
                  activeConv?.conversationId === conv.conversationId && "bg-secondary",
                )}>
                <Avatar
                  src={conv.participant?.avatarUrl ?? null}
                  alt={conv.participant?.displayName ?? "Unknown"}
                  size={44}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className={cn("text-sm font-medium text-foreground", conv.unreadCount > 0 && "font-bold")}>
                      {conv.participant?.displayName ?? "Unknown"}
                    </p>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground">{relativeTime(conv.lastMessage.createdAt)}</span>
                    )}
                  </div>
                  <p className={cn("text-xs truncate text-muted-foreground", conv.unreadCount > 0 && "text-foreground font-medium")}>
                    {conv.lastMessage?.text ?? "No messages yet"}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-[#0095f6] text-white rounded-full flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Chat view */}
        {activeConv ? (
          <div className="flex-1 flex flex-col">
            {/* Chat header */}
            <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border bg-background/90 backdrop-blur-xl">
              <button onClick={() => setActiveConv(null)} className="lg:hidden text-foreground hover:text-muted-foreground">
                <ChevronLeft size={24} />
              </button>
              <Avatar
                src={activeConv.participant?.avatarUrl ?? null}
                alt={activeConv.participant?.displayName ?? "Unknown"}
                size={32}
              />
              <span className="font-semibold text-foreground">{activeConv.participant?.displayName ?? "Unknown"}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender.id === user.id;
                return (
                  <div key={msg.id} className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                    {!isMe && <Avatar src={msg.sender.avatarUrl} alt={msg.sender.displayName} size={28} />}
                    <div className={cn(
                      "max-w-[80%] px-4 py-3 text-[15px] leading-relaxed",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tl-2xl rounded-bl-2xl rounded-tr-sm rounded-br-2xl"
                        : "bg-secondary text-foreground rounded-tr-2xl rounded-br-2xl rounded-tl-sm rounded-bl-2xl",
                    )}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="sticky bottom-0 p-3 border-t border-border bg-background flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Message…"
                className="flex-1 px-4 py-3 rounded-2xl bg-secondary text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim()}
                className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <p className="text-muted-foreground text-sm">Select a conversation</p>
          </div>
        )}
      </div>

      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
