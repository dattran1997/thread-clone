"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth";
import { Avatar } from "@/components/ui/Avatar";
import { PostCard, Thread } from "@/components/thread/PostCard";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RightPanel } from "@/components/shell/RightPanel";

interface Profile {
  id: string; username: string; displayName: string;
  bio: string | null; avatarUrl: string | null;
  links: string[]; topics: string[]; notes: string | null;
  isVerified: boolean; isPrivate: boolean;
  threadCount: number; followerCount: number; followingCount: number;
  isFollowing: boolean; isFollowedBy: boolean;
}

type ProfileTab = "posts" | "replies" | "reposts";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const viewer = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  const isOwn = viewer?.username === username;

  useEffect(() => {
    setLoading(true);
    api.get<Profile>(`/users/${username}`)
      .then((p) => { setProfile(p); setFollowing(p.isFollowing); })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [username, router]);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    const start = Date.now();
    api.get<{ data: Thread[] }>(`/threads/user/${profile.id}?type=${tab}`)
      .then((r) => setThreads(r.data))
      .catch(() => setThreads([]))
      .finally(() => {
        // Minimum 650ms skeleton so it doesn't flash
        const elapsed = Date.now() - start;
        const delay = Math.max(0, 650 - elapsed);
        setTimeout(() => setLoading(false), delay);
      });
  }, [profile, tab]);

  async function toggleFollow() {
    if (!viewer || !profile) return;
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    try {
      if (wasFollowing) {
        await api.delete(`/users/${profile.id}/follow`);
      } else {
        await api.post(`/users/${profile.id}/follow`, {});
        toast(`Following @${profile.username}`);
      }
    } catch {
      setFollowing(wasFollowing);
      toast("Failed to update follow", "error");
    }
  }

  if (loading && !profile) {
    return (
      <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
        <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
          <DesktopSidebar />
        </div>
        <main className="w-full max-w-[622px] border-r border-border min-h-screen">
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <main className="w-full max-w-[622px] border-r border-border min-h-screen pb-14 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 bg-background/90 backdrop-blur-xl border-b border-border">
          <button onClick={() => router.back()} className="text-foreground hover:text-muted-foreground transition-colors">
            <ChevronLeft size={24} />
          </button>
          <span className="font-semibold text-foreground">{profile.displayName}</span>
        </div>

        {/* Profile info */}
        <div className="flex flex-col px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[24px] font-bold text-foreground">{profile.displayName}</h1>
                {profile.isVerified && (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-label="Verified">
                    <circle cx="10" cy="10" r="10" fill="#0095F6"/>
                    <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[14px] text-muted-foreground">{profile.username}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">threads.net</span>
              </div>
            </div>
            <Avatar src={profile.avatarUrl} alt={profile.displayName} size={84} />
          </div>

          {profile.notes && (
            <p className="text-[15px] text-muted-foreground mt-4 italic">{profile.notes}</p>
          )}

          {profile.bio && (
            <p className="text-[15px] text-foreground mt-4 leading-relaxed">{profile.bio}</p>
          )}

          {/* Topic tags */}
          {profile.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {profile.topics.map((t) => (
                <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}
                  className="rounded-full bg-secondary px-3 py-1 text-[13px] text-muted-foreground hover:bg-muted transition-colors">
                  {t}
                </Link>
              ))}
            </div>
          )}

          {/* Stats + action buttons row */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[14px]">
              <span className="text-foreground font-semibold">{profile.followerCount}</span>
              <span className="text-muted-foreground">followers</span>
              <span className="mx-1 text-muted-foreground/60">·</span>
              <span className="text-foreground font-semibold">{profile.followingCount}</span>
              <span className="text-muted-foreground">following</span>
            </div>
          </div>

          {/* Links */}
          {profile.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.links.map((link) => (
                <a key={link} href={link} target="_blank" rel="noopener noreferrer"
                  className="text-[13px] text-muted-foreground hover:text-foreground hover:underline transition-colors">
                  {link.replace(/^https?:\/\//, "").split("/")[0]}
                </a>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-5">
            {isOwn ? (
              <>
                <Link href="/settings?view=personal-info"
                  className="flex-1 py-3 text-center rounded-xl border border-border text-[15px] font-semibold text-foreground hover:bg-foreground/5 transition-colors">
                  Edit profile
                </Link>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast("Link copied"); }}
                  className="flex-1 py-3 rounded-xl border border-border text-[15px] font-semibold text-foreground hover:bg-foreground/5 transition-colors">
                  Share profile
                </button>
              </>
            ) : viewer ? (
              <>
                <button
                  onClick={toggleFollow}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[15px] font-semibold transition-colors",
                    following
                      ? "border border-border text-foreground hover:bg-foreground/5"
                      : "bg-primary text-primary-foreground hover:opacity-90",
                  )}>
                  {following ? "Following" : "Follow"}
                </button>
                <Link href={`/messages?user=${profile.id}`}
                  className="flex-1 py-3 text-center rounded-xl border border-border text-[15px] font-semibold text-foreground hover:bg-foreground/5 transition-colors">
                  Message
                </Link>
              </>
            ) : null}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border sticky top-[57px] z-10 bg-background">
          {(["posts", "replies", "reposts"] as ProfileTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "relative flex-1 py-4 text-[15px] font-medium capitalize transition-colors",
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}>
              {t}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Thread list */}
        {loading ? (
          [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)
        ) : threads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No {tab} yet
          </div>
        ) : (
          threads.map((t) => (
            <PostCard
              key={t.id}
              thread={t}
              onDelete={(deletedId) =>
                setThreads((prev) => prev.filter((x) => x.id !== deletedId))
              }
            />
          ))
        )}
      </main>

      <div className="hidden lg:flex w-[310px] flex-shrink-0"><RightPanel /></div>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
