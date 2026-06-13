"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { Avatar } from "@/components/ui/Avatar";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { cn, relativeTime } from "@/lib/utils";
import { ChevronLeft, ChevronDown, Send, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { connectMessagesSocket, disconnectMessagesSocket } from "@/lib/ws";
import { toast } from "@/components/ui/Toast";

// ── Types ──────────────────────────────────────────────────────────────────

interface Conversation {
  conversationId: string;
  participant: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
  lastMessage: { id: string; text: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  text: string;
  isDeleted: boolean;
  createdAt: string;
}

interface StartConversationResponse {
  id: string;
  updatedAt: string;
  participants: { userId: string; user: { id: string; username: string; displayName: string; avatarUrl: string | null } }[];
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const user        = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const searchParams = useSearchParams();
  const decrementMessages = useNotificationStore((s) => s.decrementMessages);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv,    setActiveConv]    = useState<Conversation | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [text,          setText]          = useState("");
  const [loading,       setLoading]       = useState(true);
  const [convMenu,      setConvMenu]      = useState<string | null>(null);
  const [hoveredMsg,    setHoveredMsg]    = useState<string | null>(null);

  // Pagination (load older messages)
  const [msgCursor,   setMsgCursor]   = useState<string | null>(null);
  const [msgHasMore,  setMsgHasMore]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Scroll-to-bottom button visibility
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Refs
  const bottomRef         = useRef<HTMLDivElement>(null);
  const topRef            = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeConvRef     = useRef<Conversation | null>(null);

  // Keep activeConvRef in sync so socket handlers always see current conversation
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  // Close conversation menu on outside click
  useEffect(() => {
    if (!convMenu) return;
    const close = () => setConvMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [convMenu]);

  // ── Load conversation list ───────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const recipientId = searchParams.get("user");

    api.get<{ data: Conversation[] }>("/messages")
      .then(async (r) => {
        const seen = new Set<string>();
        const deduped = r.data.filter((c) => {
          if (seen.has(c.conversationId)) return false;
          seen.add(c.conversationId);
          return true;
        });
        setConversations(deduped);

        if (recipientId) {
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
            setConversations((prev) =>
              prev.some((c) => c.conversationId === res.id) ? prev : [conv, ...prev],
            );
            openConversation(conv);
          } catch {}
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── WebSocket (messages namespace) ──────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return;
    const socket = connectMessagesSocket(accessToken);

    const handleNewMessage = (msg: Message) => {
      if (activeConvRef.current?.conversationId === msg.conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Auto-scroll only when already near the bottom
        const el = scrollContainerRef.current;
        const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 150;
        if (nearBottom) {
          setTimeout(() => scrollToBottom("smooth"), 50);
        }
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.conversationId !== msg.conversationId) return c;
          const isActive = activeConvRef.current?.conversationId === msg.conversationId;
          return {
            ...c,
            lastMessage: { id: msg.id, text: msg.text, senderId: msg.senderId, createdAt: msg.createdAt },
            unreadCount: isActive ? 0 : c.unreadCount + 1,
          };
        }),
      );
    };

    // Soft-delete broadcast — mark as deleted instead of removing
    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, isDeleted: true } : m),
      );
    };

    socket.on("new-message",      handleNewMessage);
    socket.on("message-deleted",  handleMessageDeleted);

    return () => {
      socket.off("new-message",     handleNewMessage);
      socket.off("message-deleted", handleMessageDeleted);
      disconnectMessagesSocket();
    };
  }, [accessToken]);

  // ── Open conversation ────────────────────────────────────────────────────

  async function openConversation(conv: Conversation) {
    setActiveConv(conv);
    activeConvRef.current = conv;
    setMessages([]);
    setMsgCursor(null);
    setMsgHasMore(false);
    setLoadingMore(false);
    setShowScrollBtn(false);

    if (conv.unreadCount > 0) {
      decrementMessages(conv.unreadCount);
      setConversations((prev) =>
        prev.map((c) => c.conversationId === conv.conversationId ? { ...c, unreadCount: 0 } : c),
      );
    }

    if (accessToken) {
      const socket = connectMessagesSocket(accessToken);
      socket.emit("join-conversation", { conversationId: conv.conversationId });
    }

    const res = await api.get<{ data: Message[]; nextCursor: string | null; hasMore: boolean }>(
      `/messages/${conv.conversationId}`,
    );
    // API returns newest-first; reverse so oldest is at the top
    setMessages(res.data.slice().reverse());
    setMsgCursor(res.nextCursor);
    setMsgHasMore(res.hasMore);

    // Jump to bottom instantly after first load
    setTimeout(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  // ── Load older messages (triggered by scrolling to top) ─────────────────

  const loadOlderMessages = useCallback(async () => {
    if (!activeConv || !msgHasMore || loadingMore || !msgCursor) return;
    setLoadingMore(true);

    const scrollEl = scrollContainerRef.current;
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0;

    try {
      const res = await api.get<{ data: Message[]; nextCursor: string | null; hasMore: boolean }>(
        `/messages/${activeConv.conversationId}?cursor=${msgCursor}`,
      );
      const older = res.data.slice().reverse(); // oldest first
      setMessages((prev) => [...older, ...prev]);
      setMsgCursor(res.nextCursor);
      setMsgHasMore(res.hasMore);

      // Restore scroll position after prepending so the viewport doesn't jump
      requestAnimationFrame(() => {
        if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight;
      });
    } catch {
      toast("Failed to load older messages", "error");
    } finally {
      setLoadingMore(false);
    }
  }, [activeConv, msgHasMore, loadingMore, msgCursor]);

  // IntersectionObserver on the sentinel div at the top of the message list
  useEffect(() => {
    const topEl  = topRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!topEl || !msgHasMore || loadingMore) return;

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadOlderMessages(); },
      { root: scrollEl, rootMargin: "80px" },
    );
    obs.observe(topEl);
    return () => obs.disconnect();
  }, [msgHasMore, loadingMore, loadOlderMessages]);

  // ── Scroll tracking ──────────────────────────────────────────────────────

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 150);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }

  // ── Send message (via WebSocket) ─────────────────────────────────────────

  function sendMessage() {
    if (!text.trim() || !activeConv || !accessToken) return;
    const socket = connectMessagesSocket(accessToken);
    socket.emit("send-message", { conversationId: activeConv.conversationId, text: text.trim() });
    setText("");
  }

  // ── Unsend (soft-delete) message ─────────────────────────────────────────

  async function unsendMessage(messageId: string) {
    if (!activeConv) return;
    // Optimistic: mark deleted immediately
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isDeleted: true } : m));
    try {
      await api.delete(`/messages/${activeConv.conversationId}/messages/${messageId}`);
    } catch {
      // Rollback
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isDeleted: false } : m));
      toast("Failed to unsend message", "error");
    }
  }

  // ── Delete conversation ──────────────────────────────────────────────────

  async function deleteConversation(conversationId: string) {
    setConvMenu(null);
    try {
      await api.delete(`/messages/${conversationId}`);
      setConversations((prev) => prev.filter((c) => c.conversationId !== conversationId));
      if (activeConv?.conversationId === conversationId) setActiveConv(null);
    } catch {
      toast("Failed to delete conversation", "error");
    }
  }

  // ── Auth guards ──────────────────────────────────────────────────────────

  if (!hasHydrated) return <div className="flex h-screen bg-background" />;
  if (!user) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <p className="text-muted-foreground">Please log in to see messages</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    // h-screen + overflow-hidden gives us a fixed viewport so the messages area
    // can scroll internally (required for the scroll-to-bottom button and sentinel).
    <div className="flex h-screen w-full justify-center bg-background text-foreground overflow-hidden">

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-screen border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      {/* Main content */}
      <div className="flex w-full max-w-[900px] border-r border-border h-full overflow-hidden">

        {/* ── Conversation list ─────────────────────────────────────── */}
        <div className={cn(
          "flex flex-col border-r border-border h-full overflow-hidden",
          activeConv ? "hidden lg:flex w-[340px]" : "flex-1 lg:w-[340px] lg:flex-none",
        )}>
          <div className="flex-shrink-0 px-4 py-4 border-b border-border bg-background/90 backdrop-blur-xl">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No conversations yet</div>
            ) : (
              conversations.map((conv) => (
                <div key={conv.conversationId} className="relative group">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openConversation(conv)}
                    onKeyDown={(e) => e.key === "Enter" && openConversation(conv)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-4 border-b border-border hover:bg-foreground/5 transition-colors cursor-pointer",
                      conv.unreadCount > 0 && "bg-foreground/5",
                      activeConv?.conversationId === conv.conversationId && "bg-secondary",
                    )}
                  >
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
                          <span className="text-xs text-muted-foreground mr-6">
                            {relativeTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs truncate text-muted-foreground pr-6",
                        conv.unreadCount > 0 && "text-foreground font-medium",
                      )}>
                        {conv.lastMessage?.text ?? "No messages yet"}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-[#0095f6] text-white rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Three-dot menu trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConvMenu((prev) => prev === conv.conversationId ? null : conv.conversationId);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-foreground/10 text-muted-foreground transition-opacity"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {convMenu === conv.conversationId && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-3 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-border bg-background shadow-lg overflow-hidden"
                    >
                      <button
                        onClick={() => deleteConversation(conv.conversationId)}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-500 hover:bg-foreground/5 transition-colors"
                      >
                        <Trash2 size={15} />
                        Delete chat
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Chat view ─────────────────────────────────────────────── */}
        {activeConv ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">

            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4 border-b border-border bg-background/90 backdrop-blur-xl z-20">
              <button onClick={() => setActiveConv(null)} className="lg:hidden text-foreground hover:text-muted-foreground">
                <ChevronLeft size={24} />
              </button>
              <Link
                href={activeConv.participant ? `/${activeConv.participant.username}` : "#"}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <Avatar
                  src={activeConv.participant?.avatarUrl ?? null}
                  alt={activeConv.participant?.displayName ?? "Unknown"}
                  size={32}
                />
                <span className="font-semibold text-foreground">
                  {activeConv.participant?.displayName ?? "Unknown"}
                </span>
              </Link>
            </div>

            {/* Messages — this div is the scroll container */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-1"
            >
              {/* Top sentinel — enters viewport when user scrolls to the top */}
              <div ref={topRef} className="h-px" />

              {/* Spinner while loading older messages */}
              {loadingMore && (
                <div className="flex justify-center py-3">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              )}

              {/* "Beginning of conversation" when there's nothing older */}
              {!msgHasMore && messages.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-3 pb-2">
                  Beginning of conversation
                </p>
              )}

              {/* Messages */}
              <div className="space-y-2">
                {messages.map((msg) => {
                  const isMe = msg.sender.id === user.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}
                      onMouseEnter={() => { if (isMe && !msg.isDeleted) setHoveredMsg(msg.id); }}
                      onMouseLeave={() => setHoveredMsg(null)}
                    >
                      {/* Other person's avatar */}
                      {!isMe && (
                        <Avatar src={msg.sender.avatarUrl} alt={msg.sender.displayName} size={28} />
                      )}

                      {/* Unsend button — own, non-deleted messages only */}
                      {isMe && !msg.isDeleted && (
                        <button
                          onClick={() => unsendMessage(msg.id)}
                          title="Unsend"
                          className={cn(
                            "flex-shrink-0 p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-foreground/10 transition-all",
                            hoveredMsg === msg.id ? "opacity-100" : "opacity-0 pointer-events-none",
                          )}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      {/* Deleted placeholder or message bubble */}
                      {msg.isDeleted ? (
                        <p className={cn(
                          "text-sm italic text-muted-foreground px-4 py-2.5 rounded-2xl border border-border/50 max-w-[70%]",
                          isMe ? "rounded-tr-sm" : "rounded-tl-sm",
                        )}>
                          {isMe ? "You unsent a message" : "This message was deleted"}
                        </p>
                      ) : (
                        <div className={cn(
                          "max-w-[70%] px-4 py-3 text-[15px] leading-relaxed break-words",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tl-2xl rounded-bl-2xl rounded-tr-sm rounded-br-2xl"
                            : "bg-secondary text-foreground rounded-tr-2xl rounded-br-2xl rounded-tl-sm rounded-bl-2xl",
                        )}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom anchor for auto-scroll */}
              <div ref={bottomRef} className="h-1" />
            </div>

            {/* Scroll-to-bottom button — floats above the input */}
            {showScrollBtn && (
              <button
                onClick={() => scrollToBottom("smooth")}
                title="Jump to latest"
                className="absolute right-4 bottom-[72px] z-10 flex items-center justify-center w-9 h-9 rounded-full bg-background border border-border shadow-lg text-foreground hover:bg-secondary transition-colors"
              >
                <ChevronDown size={18} />
              </button>
            )}

            {/* Input bar */}
            <div className="flex-shrink-0 p-3 border-t border-border bg-background flex items-center gap-2 pb-[max(12px,env(safe-area-inset-bottom))]">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
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

      {/* Mobile bottom nav */}
      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
