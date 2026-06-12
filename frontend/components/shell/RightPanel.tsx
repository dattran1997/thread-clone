"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { fmtN } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

interface TrendingTag { tag: string; threadCount: number; }
interface SuggestedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  _count: { followers: number };
}

export function RightPanel() {
  const user = useAuthStore((s) => s.user);
  const [trending, setTrending] = useState<TrendingTag[]>([]);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<TrendingTag[]>("/search/trending").then(setTrending).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get<{ data: SuggestedUser[] }>("/users/suggestions")
      .then((r) => setSuggested(r.data.slice(0, 3)))
      .catch(() => {});
  }, [user]);

  async function follow(u: SuggestedUser) {
    try {
      await api.post(`/users/${u.id}/follow`, {});
      setFollowing((prev) => new Set([...prev, u.id]));
    } catch {}
  }

  return (
    <aside className="w-[310px] flex flex-col gap-6 py-6 px-6 sticky top-0 h-screen overflow-y-auto">
      {/* Search bar */}
      <Link
        href="/search"
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary text-muted-foreground text-[15px] hover:bg-muted transition-colors"
      >
        <Search size={18} className="flex-shrink-0" />
        <span>Search</span>
      </Link>

      {/* Trending widget */}
      <section>
        <h3 className="text-[15px] font-semibold text-foreground mb-4">Trending</h3>
        {trending.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">No trending topics yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {trending.map((item, i) => (
              <Link
                key={item.tag}
                href={`/search?q=${encodeURIComponent("#" + item.tag)}`}
                className="flex flex-col hover:opacity-80 transition-opacity"
              >
                <span className="text-[12px] text-muted-foreground">{i + 1} · Trending</span>
                <span className="text-[15px] text-foreground font-semibold">#{item.tag}</span>
                <span className="text-[12px] text-muted-foreground">{fmtN(item.threadCount)} threads</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Suggested users */}
      {user && (
        <section>
          <h3 className="text-[15px] font-semibold text-foreground mb-4">Suggested for you</h3>
          {suggested.length === 0 ? (
            <>
              <p className="text-[14px] text-muted-foreground">Follow people to see their threads here.</p>
              <Link href="/search" className="text-[14px] text-foreground font-medium mt-2 inline-block hover:underline">
                Find people →
              </Link>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              {suggested.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <Link href={`/${u.username}`}>
                    <Avatar src={u.avatarUrl} alt={u.displayName} size={36} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/${u.username}`} className="text-[14px] font-semibold text-foreground hover:underline block truncate">
                      {u.displayName}
                    </Link>
                    <p className="text-[12px] text-muted-foreground">{fmtN(u._count.followers)} followers</p>
                  </div>
                  {!following.has(u.id) ? (
                    <button
                      onClick={() => follow(u)}
                      className="text-[13px] font-semibold border border-border rounded-xl px-3 py-1 hover:bg-foreground/5 transition-colors text-foreground flex-shrink-0"
                    >
                      Follow
                    </button>
                  ) : (
                    <span className="text-[13px] text-muted-foreground flex-shrink-0">Following</span>
                  )}
                </div>
              ))}
              <Link href="/search" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                See more →
              </Link>
            </div>
          )}
        </section>
      )}
    </aside>
  );
}
