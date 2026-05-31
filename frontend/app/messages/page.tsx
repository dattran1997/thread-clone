"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Avatar } from "@/components/ui/Avatar";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { BackIcon, SendIcon } from "@/components/ui/Icons";
import { cn, relativeTime, fmtN } from "@/lib/utils";

interface Conversation {
  id: string;
  participant: { id: string; username: string; displayName: string; avatarUrl: string | null };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  text: string;
  createdAt: string;
}

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    api.get<{ data: Conversation[] }>("/messages")
      .then((r) => setConversations(r.data))
      .finally(() => setLoading(false));
  }, [user]);

  async function openConversation(conv: Conversation) {
    setActiveConv(conv);
    const res = await api.get<{ data: Message[] }>(`/messages/${conv.id}`);
    setMessages(res.data);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function sendMessage() {
    if (!text.trim() || !activeConv) return;
    const optimistic: Message = {
      id: crypto.randomUUID(),
      conversationId: activeConv.id,
      sender: { id: user!.id, username: user!.username, displayName: user!.displayName, avatarUrl: user!.avatarUrl },
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      await api.post(`/messages/${activeConv.id}`, { text: optimistic.text });
    } catch {}
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--text2)]">Please log in to see messages</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]">
        <DesktopSidebar />
      </div>

      <div className="flex-1 flex max-w-[900px] mx-auto border-r border-[var(--border)] min-h-screen">
        {/* Conversation list */}
        <div className={cn(
          "flex flex-col border-r border-[var(--border)]",
          activeConv ? "hidden lg:flex w-[340px]" : "flex-1 lg:w-[340px] lg:flex-none",
        )}>
          <div className="sticky top-0 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-md">
            <h1 className="text-xl font-bold text-[var(--text)]">Messages</h1>
          </div>

          {loading ? (
            <div className="p-4 text-center text-[var(--text2)] text-sm">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--text2)]">No conversations yet</div>
          ) : (
            conversations.map((conv) => (
              <button key={conv.id} onClick={() => openConversation(conv)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--bg2)] transition-colors text-left w-full",
                  conv.unreadCount > 0 && "bg-blue-500/5",
                  activeConv?.id === conv.id && "bg-[var(--bg2)]",
                )}>
                <Avatar src={conv.participant.avatarUrl} alt={conv.participant.displayName} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <p className={cn("text-sm", conv.unreadCount > 0 ? "font-bold text-[var(--text)]" : "font-medium text-[var(--text)]")}>
                      {conv.participant.displayName}
                    </p>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-[var(--text3)]">{relativeTime(conv.lastMessageAt)}</span>
                    )}
                  </div>
                  <p className={cn("text-xs truncate", conv.unreadCount > 0 ? "text-[var(--text)]" : "text-[var(--text2)]")}>
                    {conv.lastMessage ?? "No messages yet"}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
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
            <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-md">
              <button onClick={() => setActiveConv(null)} className="lg:hidden p-1 text-[var(--text2)]">
                <BackIcon size={20} />
              </button>
              <Avatar src={activeConv.participant.avatarUrl} alt={activeConv.participant.displayName} size={32} />
              <span className="font-semibold text-[var(--text)]">{activeConv.participant.displayName}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender.id === user.id;
                return (
                  <div key={msg.id} className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                    {!isMe && <Avatar src={msg.sender.avatarUrl} alt={msg.sender.displayName} size={28} />}
                    <div className={cn(
                      "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm",
                      isMe
                        ? "bg-[var(--accent)] text-[var(--accent-text)] rounded-br-sm"
                        : "bg-[var(--bg2)] text-[var(--text)] rounded-bl-sm",
                    )}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="sticky bottom-0 p-3 border-t border-[var(--border)] bg-[var(--bg)] flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Message…"
                className="flex-1 px-4 py-2.5 rounded-full bg-[var(--bg2)] text-sm text-[var(--text)] placeholder:text-[var(--text2)] outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim()}
                className="p-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                <SendIcon size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <p className="text-[var(--text2)] text-sm">Select a conversation</p>
          </div>
        )}
      </div>

      <div className="lg:hidden"><MobileNav /></div>
    </div>
  );
}
