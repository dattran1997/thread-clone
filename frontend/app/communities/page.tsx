"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

interface Community {
  id: string; name: string; slug: string;
  description: string | null; avatarUrl: string | null;
  memberCount: number; isPublic: boolean; isMember: boolean;
}

export default function CommunitiesPage() {
  const user = useAuthStore((s) => s.user);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Community[] }>("/communities")
      .then((r) => setCommunities(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function toggleJoin(community: Community) {
    if (!user) { toast("Please log in to join communities", "error"); return; }
    const wasMember = community.isMember;
    setCommunities((prev) => prev.map((c) =>
      c.id === community.id ? { ...c, isMember: !wasMember, memberCount: c.memberCount + (wasMember ? -1 : 1) } : c,
    ));
    try {
      if (wasMember) await api.delete(`/communities/${community.id}/leave`);
      else { await api.post(`/communities/${community.id}/join`, {}); toast(`Joined ${community.name}`); }
    } catch {
      setCommunities((prev) => prev.map((c) =>
        c.id === community.id ? { ...c, isMember: wasMember, memberCount: c.memberCount + (wasMember ? 1 : -1) } : c,
      ));
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]">
        <DesktopSidebar />
      </div>

      <main className="flex-1 max-w-[622px] mx-auto border-r border-[var(--border)] min-h-screen pb-14 lg:pb-0">
        <div className="sticky top-0 z-20 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-md">
          <h1 className="text-xl font-bold text-[var(--text)]">Communities</h1>
        </div>

        {loading ? (
          <div className="p-6 text-center text-[var(--text2)] text-sm">Loading communities…</div>
        ) : communities.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text2)] text-sm">No communities yet. Create the first one!</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {communities.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-4">
                <Avatar src={c.avatarUrl} alt={c.name} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text)] text-sm">{c.name}</p>
                  {c.description && <p className="text-xs text-[var(--text2)] truncate">{c.description}</p>}
                  <p className="text-xs text-[var(--text3)] mt-0.5">{c.memberCount.toLocaleString()} members</p>
                </div>
                <button onClick={() => toggleJoin(c)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0",
                    c.isMember
                      ? "border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg2)]"
                      : "bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90",
                  )}>
                  {c.isMember ? "Joined" : "Join"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="lg:hidden"><MobileNav /></div>
    </div>
  );
}
