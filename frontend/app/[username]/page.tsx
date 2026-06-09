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

      <main className="flex-1 max-w-[622px] mx-auto border-r border-[var(--border)] min-h-screen pb-20 lg:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--bg-blur)] backdrop-blur-md border-b border-[var(--border)]">
          <button onClick={() => router.back()} className="p-1 text-[var(--text2)] hover:text-[var(--text)]">
            <BackIcon size={20} />
          </button>
          <span className="font-semibold text-[var(--text)]">{profile.displayName}</span>
        </div>

        {/* Profile info */}
        <div className="px-4 py-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-2xl font-bold text-[var(--text)]">{profile.displayName}</h1>
                {profile.isVerified && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-label="Verified">
                    <circle cx="10" cy="10" r="10" fill="#0095F6"/>
                    <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <p className="text-[var(--text2)] text-sm">@{profile.username}</p>
            </div>
            <Avatar src={profile.avatarUrl} alt={profile.displayName} size={72} />
          </div>

          {profile.notes && (
            <p className="text-sm text-[var(--text2)] mb-3 italic">{profile.notes}</p>
          )}

          {profile.bio && <p className="text-sm text-[var(--text)] mb-3">{profile.bio}</p>}

          {profile.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.links.map((link) => (
                <a key={link} href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                  <LinkIcon size={12} /> {link.replace(/^https?:\/\//, "").split("/")[0]}
                </a>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-[var(--text2)] mb-4">
            <span><strong className="text-[var(--text)]">{profile.followerCount}</strong> followers</span>
            <span><strong className="text-[var(--text)]">{profile.followingCount}</strong> following</span>
          </div>

          {/* Topics */}
          {profile.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {profile.topics.map((t) => (
                <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}
                  className="px-3 py-1 rounded-full bg-[var(--bg2)] text-xs text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors">
                  {t}
                </Link>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {isOwn ? (
              <>
                <Link href="/settings"
                  className="flex-1 py-2 text-center rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--bg2)] transition-colors">
                  Edit profile
                </Link>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast("Link copied"); }}
                  className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--bg2)] transition-colors">
                  Share profile
                </button>
              </>
            ) : viewer ? (
              <>
                <button
                  onClick={toggleFollow}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-semibold transition-colors",
                    following
                      ? "border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg2)]"
                      : "bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90",
                  )}>
                  {following ? "Following" : "Follow"}
                </button>
                <Link href={`/messages?user=${profile.id}`}
                  className="flex-1 py-2 text-center rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--bg2)] transition-colors">
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
                "flex-1 py-3 text-sm font-medium capitalize transition-colors border-b-2",
                tab === t
                  ? "border-[var(--accent)] text-[var(--text)]"
                  : "border-transparent text-[var(--text2)] hover:text-[var(--text)]",
              )}>
              {t}
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
