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
import { BackIcon, LinkIcon } from "@/components/ui/Icons";
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
    api.get<{ data: Thread[] }>(`/threads/user/${profile.id}?type=${tab}`)
      .then((r) => setThreads(r.data))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
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
      <div className="flex min-h-screen">
        <div className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]">
          <DesktopSidebar />
        </div>
        <main className="flex-1 max-w-[622px] mx-auto">
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]">
        <DesktopSidebar />
      </div>

      <main className="flex-1 max-w-[622px] mx-auto border-r border-[var(--border)] min-h-screen pb-14 lg:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--bg-blur)] backdrop-blur-md border-b border-[var(--border)]">
          <button onClick={() => router.back()} className="p-1 text-[var(--text2)] hover:text-[var(--text)]">
            <BackIcon size={20} />
          </button>
          <span className="font-semibold text-[var(--text)]">{profile.displayName}</span>
        </div>

        {/* Profile info */}
        <div className="px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[24px] font-bold text-[var(--text)]">{profile.displayName}</h1>
                {profile.isVerified && (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-label="Verified">
                    <circle cx="10" cy="10" r="10" fill="#0095F6"/>
                    <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[14px] text-[var(--text2)]">@{profile.username}</p>
                <span className="rounded-full bg-[var(--bg2)] px-2 py-0.5 text-[11px] text-[var(--text2)]">threads.net</span>
              </div>
            </div>
            <Avatar src={profile.avatarUrl} alt={profile.displayName} size={84} />
          </div>

          {profile.notes && (
            <p className="text-[15px] text-[var(--text2)] mt-4 italic">{profile.notes}</p>
          )}

          {profile.bio && <p className="text-[15px] text-[var(--text)] mt-4 leading-relaxed">{profile.bio}</p>}

          <div className="flex items-center gap-3 mt-4 text-[14px] text-[var(--text2)]">
            <span><strong className="text-[var(--text)]">{profile.followerCount}</strong> followers</span>
            <span className="text-[var(--text3)]">·</span>
            <span><strong className="text-[var(--text)]">{profile.followingCount}</strong> following</span>
          </div>

          {/* Topics */}
          {profile.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {profile.topics.map((t) => (
                <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}
                  className="px-3 py-1 rounded-full bg-[var(--bg2)] text-[13px] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors">
                  {t}
                </Link>
              ))}
            </div>
          )}

          {profile.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.links.map((link) => (
                <a key={link} href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[13px] text-blue-400 hover:underline">
                  <LinkIcon size={12} /> {link.replace(/^https?:\/\//, "").split("/")[0]}
                </a>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-5">
            {isOwn ? (
              <>
                <Link href="/settings"
                  className="flex-1 py-3 text-center rounded-xl border border-[var(--border)] text-[15px] font-semibold hover:bg-[var(--hover-overlay)] transition-colors">
                  Edit profile
                </Link>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast("Link copied"); }}
                  className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[15px] font-semibold hover:bg-[var(--hover-overlay)] transition-colors">
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
                      ? "border border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover-overlay)]"
                      : "bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90",
                  )}>
                  {following ? "Following" : "Follow"}
                </button>
                <Link href={`/messages?user=${profile.id}`}
                  className="flex-1 py-3 text-center rounded-xl border border-[var(--border)] text-[15px] font-semibold hover:bg-[var(--hover-overlay)] transition-colors">
                  Message
                </Link>
              </>
            ) : null}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] sticky top-14 z-10 bg-[var(--bg)]">
          {(["posts", "replies", "reposts"] as ProfileTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "relative flex-1 py-4 text-[15px] font-medium capitalize transition-colors",
                tab === t
                  ? "text-[var(--text)]"
                  : "text-[var(--text2)] hover:text-[var(--text)]",
              )}>
              {t}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--text)] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Threads */}
        {loading ? (
          [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)
        ) : threads.length === 0 ? (
          <div className="text-center py-16 text-[var(--text2)] text-sm">
            No {tab} yet
          </div>
        ) : (
          threads.map((t) => <PostCard key={t.id} thread={t} />)
        )}
      </main>

      <div className="hidden xl:block"><RightPanel /></div>
      <div className="lg:hidden"><MobileNav /></div>
    </div>
  );
}
