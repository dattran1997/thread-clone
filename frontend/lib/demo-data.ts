import type { Thread } from "@/components/thread/PostCard";

/** Realistic demo threads shown when no backend / not authenticated. */
export const DEMO_THREADS: Thread[] = [
  {
    id: "demo-1",
    author: {
      id: "u1", username: "bentley_w", displayName: "Bentley Wu",
      avatarUrl: "https://i.pravatar.cc/150?img=11", isVerified: true,
    },
    text: "Just shipped a new feature that took 3 weeks to build in 3 hours using Cursor + Claude. AI-assisted development is genuinely changing how fast small teams can move. Wild times.",
    parentId: null, isGhost: false, isEdited: false, editableUntil: null,
    likeCount: 4821, replyCount: 312, repostCount: 891, quoteCount: 47, viewCount: 94200,
    media: [], poll: null, hashtags: [], topics: [],
    isLiked: false, isReposted: false, isSaved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: "demo-2",
    author: {
      id: "u2", username: "sarah_chen", displayName: "Sarah Chen",
      avatarUrl: "https://i.pravatar.cc/150?img=5", isVerified: false,
    },
    text: "hot take: dark mode is not a preference, it's a personality trait",
    parentId: null, isGhost: false, isEdited: false, editableUntil: null,
    likeCount: 12400, replyCount: 643, repostCount: 2100, quoteCount: 188, viewCount: 210000,
    media: [], poll: null, hashtags: [], topics: [],
    isLiked: true, isReposted: false, isSaved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 37).toISOString(),
  },
  {
    id: "demo-3",
    author: {
      id: "u3", username: "mkbhd", displayName: "Marques B.",
      avatarUrl: "https://i.pravatar.cc/150?img=68", isVerified: true,
    },
    text: "The new MacBook Pro keyboard is genuinely the best laptop keyboard I've ever used. Apple went back to the right amount of travel. Sometimes the best innovation is undoing a bad decision.",
    parentId: null, isGhost: false, isEdited: false, editableUntil: null,
    likeCount: 8930, replyCount: 521, repostCount: 1240, quoteCount: 83, viewCount: 143000,
    media: [
      {
        id: "m1", url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80",
        type: "IMAGE" as const, altText: "MacBook keyboard closeup", order: 0,
      },
    ],
    poll: null, hashtags: [], topics: [],
    isLiked: false, isReposted: false, isSaved: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "demo-4",
    author: {
      id: "u4", username: "leachim6", displayName: "Michael L.",
      avatarUrl: "https://i.pravatar.cc/150?img=33", isVerified: false,
    },
    text: "reminder that 'senior developer' often just means 'has been burned enough times to write better error messages'",
    parentId: null, isGhost: false, isEdited: false, editableUntil: null,
    likeCount: 31200, replyCount: 1480, repostCount: 7200, quoteCount: 420, viewCount: 510000,
    media: [], poll: null, hashtags: [], topics: [],
    isLiked: false, isReposted: false, isSaved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "demo-5",
    author: {
      id: "u5", username: "designdept", displayName: "Design Dept.",
      avatarUrl: "https://i.pravatar.cc/150?img=47", isVerified: true,
    },
    text: "The best UI is the one users never think about. Invisible design is the hardest kind to build and the easiest to take for granted. Your job is to disappear.",
    parentId: null, isGhost: false, isEdited: false, editableUntil: null,
    likeCount: 5670, replyCount: 189, repostCount: 1820, quoteCount: 94, viewCount: 78400,
    media: [], poll: null, hashtags: ["design", "ux"], topics: [],
    isLiked: false, isReposted: false, isSaved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "demo-6",
    author: {
      id: "u6", username: "threadsapp", displayName: "Threads",
      avatarUrl: "https://i.pravatar.cc/150?img=60", isVerified: true,
    },
    text: "Share what's on your mind. Start a conversation. Join millions of people talking about what matters — in real time.",
    parentId: null, isGhost: false, isEdited: false, editableUntil: null,
    likeCount: 22000, replyCount: 830, repostCount: 3400, quoteCount: 210, viewCount: 320000,
    media: [], poll: null, hashtags: [], topics: [],
    isLiked: false, isReposted: false, isSaved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
  },
];
