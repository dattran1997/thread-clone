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
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <main className="w-full max-w-[622px] border-r border-border min-h-screen pb-14 md:pb-0">
        <div className="sticky top-0 z-20 px-4 py-3 border-b border-border bg-background/90 backdrop-blur-xl">
          <h1 className="text-xl font-bold text-foreground">Communities</h1>
        </div>

        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Loading communities…</div>
        ) : communities.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm">No communities yet. Create the first one!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {communities.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-4 hover:bg-foreground/5 transition-colors">
                <Avatar src={c.avatarUrl} alt={c.name} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{c.name}</p>
                  {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{c.memberCount.toLocaleString()} members</p>
                </div>
                <button onClick={() => toggleJoin(c)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0",
                    c.isMember
                      ? "border border-border text-foreground hover:bg-foreground/5"
                      : "bg-primary text-primary-foreground hover:opacity-90",
                  )}>
                  {c.isMember ? "Joined" : "Join"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
