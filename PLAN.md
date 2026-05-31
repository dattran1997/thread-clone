# Project Plan: Threads Clone ("Wobbly Bentley")

> **Role**: Technical PM — you own the roadmap, verify features, and can drill into any module's code.
> **Stack decision**: Next.js 15 + NestJS + PostgreSQL + TypeScript — two top-level folders (`frontend/` + `backend/`), runs on Raspberry Pi 5 today, cloud-ready tomorrow.

---

## Context

Build a full-featured clone of Meta Threads — a text-first social platform with image/video support, threaded replies, following graph, notifications, and discovery. The project is greenfield. The MVP goal is a working "core social loop" (Auth → Post → Feed → Follow → React → Reply) before expanding to full feature parity. Infrastructure runs on Raspberry Pi 5 with Docker Compose; the setup is intentionally cloud-migratable.

---

## Design Source

> Full design bundle read from: `https://api.anthropic.com/v1/design/h/aQGTYaE_NyXkT32phJ9YQQ`
> Primary file: `Threads Clone.html` — React (JSX/Babel) interactive prototype with 7 component files.

### Design Components → Production Mapping

| Design file | NestJS module | Next.js file |
|---|---|---|
| `components/data.js` | — (seed data only) | `lib/mock-data.ts` |
| `components/helpers.jsx` | — | `components/ui/` (Avatar, VBadge, Icons, Toast, Skeleton) |
| `components/PostCard.jsx` | `threads/` | `components/thread/PostCard.tsx` |
| `components/FeedPage.jsx` | `feed/` | `app/(home)/page.tsx` |
| `components/ThreadView.jsx` | `threads/` | `app/threads/[id]/page.tsx` |
| `components/PostComposer.jsx` | `threads/` | `components/thread/Composer.tsx` |
| `pages.jsx` (SearchPage) | `search/` | `app/search/page.tsx` |
| `pages.jsx` (ProfilePage) | `users/` | `app/[username]/page.tsx` |
| `pages.jsx` (ActivityPage) | `notifications/` | `app/activity/page.tsx` |
| `pages.jsx` (MessagesPage+ChatView) | `messages/` | `app/messages/page.tsx` |
| `ThreadsApp.jsx` | — | `app/layout.tsx` + `components/shell/` |

### Design Feature → Plan Coverage

| Feature from design | In original plan? | Update needed |
|---|---|---|
| For You / Following feed tabs | ✅ M05 | — |
| Skeleton loading + new posts pill | ❌ | Add to M05 |
| Ghost posts (24h auto-archive) | ❌ | Add to M03 |
| Polls (2–4 options, 24h close) | ❌ | Add to M03 |
| Save / Bookmark posts | ❌ | Add to M06 |
| Quote repost (distinct from repost) | ❌ (partial) | Add to M06 |
| Topic tags on posts (not hashtags) | ❌ | Add to M03/M10 |
| 20 media items per post | ❌ (had 10) | Fix M11 |
| 5-minute video | ❌ (had MB limit only) | Fix M11 |
| Double-tap to like | ❌ | Add to M06 |
| Bounce animation on like | ❌ | Add to M06 |
| Repost context menu (Repost / Quote) | ❌ | Add to M06 |
| Toast notification system | ❌ | Add to frontend core |
| Dark / Light / Warm themes | ❌ | Add to M16 (Frontend) |
| Mobile / Desktop / Auto layout | ❌ | Add to M16 (Frontend) |
| Edit post within 15 min | ❌ | Add to M03 |
| Reply approvals | ❌ | Add to M07 |
| Post scheduling + 100 drafts | ❌ | Add to M03 |
| Profile topic tags (up to 10) | ❌ | Add to M02 |
| Profile links (up to 5) | ❌ (had 1) | Fix M02 |
| Profile tabs: posts/replies/reposts | ❌ | Add to M02 |
| Activity filters (all/mentions/follows) | ❌ (partial) | Add to M08 |
| Direct Messages | ⚠️ Listed as gap | Add M16 |
| Communities (Loops) | ❌ | Add M17 |
| Insights & Analytics | ❌ | Add M18 |
| Landing / Login page | ✅ M01 | — |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      FRONTEND TIER                       │
│  Next.js 15 (App Router · Server + Client Components)    │
│  TanStack Query · Zustand · Tailwind · shadcn/ui          │
└──────────────────┬───────────────────────────────────────┘
                   │ HTTP / WebSocket (wss://)
┌──────────────────▼───────────────────────────────────────┐
│                  CLOUDFLARE (DNS + CDN)                   │
│  DDoS protection · Static asset caching · SSL termination│
└──────────────────┬───────────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼───────────────────────────────────────┐
│           NGINX REVERSE PROXY (Raspberry Pi 5)           │
│  /api/*  → NestJS :3001    /*  → Next.js :3000           │
│  /ws/*   → Socket.io        /media/* → MinIO :9000       │
└──────┬───────────────────────────────────────────────────┘
       │                       Docker Compose Network
       ├─── NestJS API (:3001)
       │       ├── PostgreSQL (:5432)  [primary data store]
       │       ├── Redis (:6379)       [cache · sessions · pub/sub]
       │       └── MinIO (:9000)       [S3-compatible object store]
       │
       ├─── Background Workers (Bull queues via Redis)
       │       ├── notification-worker  (fan-out notifications)
       │       ├── media-worker         (compress · thumbnail · alt-text)
       │       └── feed-worker          (pre-compute For You feed)
       │
       └─── Monitoring Stack
               ├── Prometheus (:9090)
               └── Grafana (:3003)
```

### Cloud migration path
- MinIO → AWS S3 / Cloudflare R2 (change one env var)
- PostgreSQL → RDS / Supabase (connection string swap)
- Redis → ElastiCache / Upstash
- Docker Compose → Docker Swarm or ECS (same Compose files, different orchestrator)

---

## Project Structure

Root folder: `Thread clone/` — contains exactly two app folders plus supporting folders.

```
Thread clone/
│
├── Frontend/                     # Next.js 15 — standalone app
│   ├── CLAUDE.md                 # Context for Claude when working here
│   ├── package.json
│   ├── .env.local                # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
│   ├── app/                      # App Router — pages & layouts
│   │   ├── layout.tsx            # Root layout (theme, shell, nav)
│   │   ├── (auth)/               # Login, register, forgot-password
│   │   ├── (home)/               # Home feed
│   │   ├── [username]/           # Public profile page
│   │   ├── threads/[id]/         # Thread detail + replies
│   │   ├── search/               # Search + trending
│   │   ├── activity/             # Notifications
│   │   ├── messages/             # DM list + chat
│   │   ├── communities/          # Communities list + detail
│   │   ├── insights/             # Creator analytics
│   │   ├── settings/             # User settings
│   │   └── admin/                # Admin panel (role-guarded)
│   ├── components/
│   │   ├── ui/                   # Design system: Avatar, Icon, Toast, Skeleton, VBadge
│   │   ├── shell/                # MobileNav, DesktopSidebar, RightPanel, ThemeSwitcher
│   │   └── thread/               # PostCard, Composer, ThreadView, PollBlock, MediaCarousel
│   ├── lib/
│   │   ├── api.ts                # API client (fetch wrapper + auth headers)
│   │   ├── ws.ts                 # Socket.io client singleton
│   │   └── utils.ts              # fmtN, formatDate, cn() (Tailwind merge)
│   └── stores/
│       ├── theme.ts              # Zustand: dark/light/warm + localStorage
│       ├── auth.ts               # Zustand: current user, JWT tokens
│       └── notifications.ts      # Zustand: unread count
│
├── Backend/                      # NestJS — standalone API + workers
│   ├── CLAUDE.md                 # Context for Claude when working here
│   ├── package.json
│   ├── .env                      # DATABASE_URL, REDIS_URL, JWT_SECRET, MINIO_*, etc.
│   ├── prisma/
│   │   ├── schema.prisma         # Single source of truth for DB schema
│   │   └── migrations/           # Auto-generated migration files
│   └── src/
│       ├── main.ts               # Bootstrap, Swagger, CORS
│       ├── app.module.ts         # Root module wiring
│       ├── common/               # Guards, pipes, interceptors, decorators
│       │   ├── guards/           # JwtAuthGuard, RolesGuard
│       │   ├── decorators/       # @CurrentUser(), @Roles()
│       │   └── filters/          # Global exception filter (RFC 7807 errors)
│       ├── config/               # Env validation (joi schema)
│       ├── workers/              # ⚠️ Decision A — see below
│       │   ├── notification.processor.ts
│       │   ├── media.processor.ts
│       │   └── feed.processor.ts
│       └── modules/              # One folder per feature — each has controller/service/module/dto
│           ├── auth/
│           ├── users/
│           ├── threads/
│           ├── follows/
│           ├── feed/
│           ├── reactions/
│           ├── notifications/    # WebSocket gateway lives here
│           ├── search/
│           ├── hashtags/
│           ├── mentions/
│           ├── messages/
│           ├── media/
│           ├── moderation/
│           ├── settings/
│           ├── communities/
│           ├── analytics/
│           ├── admin/
│           └── health/
│
├── docs/
│   ├── api/openapi.yaml          # Auto-generated; Swagger UI at /api/docs
│   ├── architecture/             # ADRs + diagrams
│   ├── usecases/                 # User story → flow → API mapping
│   └── pm-testplans/             # Manual QA checklists (one .md per module)
│
└── infra/
    ├── docker-compose.yml        # Frontend, Backend, PostgreSQL, Redis, MinIO, Nginx
    ├── nginx/nginx.conf
    └── monitoring/               # Prometheus + Grafana
```

### ⚠️ Decisions You Need to Make

| # | Decision | Option A | Option B | Recommendation |
|---|----------|----------|----------|----------------|
| **A** | Where do background workers live? | Inside `Backend/src/workers/` — same NestJS process, easier to share DB/Redis connections | Separate `Workers/` folder — isolated process, restarts independently | **Option A (Recommended)** — simpler on a Pi, NestJS Bull integration is first-class |
| **B** | Shared TypeScript types (DTOs, API response shapes)? | Copy types manually in both repos | Create a `Shared/` folder with shared interfaces, import via relative path | **Option B** — avoids drift between frontend API client and backend DTOs |
| **C** | Folder name casing? | `Frontend/` + `Backend/` (PascalCase, as you wrote) | `frontend/` + `backend/` (lowercase, standard on Linux/Docker) | **Lowercase recommended** — Docker volume mounts and Linux filesystems are case-sensitive; avoids bugs on Pi |

### Code Conventions (Claude-optimized + Human-readable)

| Rule | Why |
|------|-----|
| **TypeScript strict mode** everywhere | Catches bugs at edit time, not runtime |
| **One module = one folder** in NestJS | PM can navigate by feature, not layer |
| **Feature-first** folder structure (not layer-first) | `threads/threads.controller.ts` not `controllers/threads.ts` |
| **Named exports** only (no default exports) | Refactoring and imports are unambiguous |
| **Barrel files** (`index.ts`) per module | Clean imports, easy to see module surface |
| **DTOs with class-validator** | Input validation co-located with the shape |
| **Prisma** as ORM | Schema = single source of truth; migrations are files |
| **Zod** on frontend for API response validation | Runtime safety at the boundary |
| **No magic strings** — use enums/constants | `ThreadStatus.DELETED` not `"deleted"` |
| **`CLAUDE.md`** per app | Claude gets context before touching each app |

---

## Module Checklist (PM Progress View)

Each module is an independent NestJS module + Next.js feature folder.
Status: `[ ]` Not started · `[~]` In progress · `[x]` Done

### PHASE 1 — Core Social Loop (MVP)

#### M01 · Authentication & Sessions
- [ ] User registration (email + password)
- [ ] Login endpoint (email/password → JWT access token + refresh token)
- [ ] Refresh token rotation
- [ ] Logout (revoke refresh token)
- [ ] JWT auth guard (protects all private routes)
- [ ] Email verification (send link on register)
- [ ] Password reset (forgot password → email link → reset)
- [ ] OAuth: Google sign-in (optional stretch)
- [ ] Rate limiting on auth endpoints

**Key files**: `backend/src/modules/auth/`, `frontend/app/(auth)/`

---

#### M02 · User Profiles
- [ ] Create profile on registration (username, display name, bio, avatar)
- [ ] Get public profile by username (`/users/:username`)
- [ ] Update own profile (bio, display name)
- [ ] Upload/change avatar (stores in MinIO)
- [ ] Up to **5 links** in bio
- [ ] Up to **10 topic tags** in bio (tapping a topic leads to topic conversations)
- [ ] **Notes** text displayed on top of profile image
- [ ] Profile tabs: Posts / Replies / Reposts (filtered views)
- [ ] Username availability check (inline, real-time)
- [ ] Account deactivation (soft delete, 30-day grace)
- [ ] "Edit profile" + "Share profile" buttons for own profile
- [ ] "Follow" + "Message" buttons for other profiles

**Key files**: `backend/src/modules/users/`, `frontend/app/[username]/page.tsx`

---

#### M03 · Thread (Post) System — CORE
- [ ] Create thread (text up to 500 chars — char counter with SVG ring at 80% full)
- [ ] Attach images/videos (up to **20** per post, stored in MinIO)
- [ ] Video up to **5 minutes** (not just MB limit)
- [ ] Link preview generation (OG scrape via worker)
- [ ] **Ghost post** toggle — auto-archive after 24h, replies go to DMs, only author sees counts
- [ ] **Poll** — 2–4 options, auto-close after 24h, live vote % bars
- [ ] **Topic tags** on post (distinct from hashtags — curated categories)
- [ ] **Post scheduling** — schedule at future date/time
- [ ] **Drafts** — save up to 100 drafts
- [ ] **Edit post** within 15-minute window (text/tags only, shows "edited" label)
- [ ] Delete own thread (soft delete)
- [ ] Get single thread detail (`/threads/:id`)
- [ ] PostCard component: displays all the above, reused everywhere in feed/profile/search
- [ ] ImgPlaceholder component for media carousel

**Key files**: `backend/src/modules/threads/`, `frontend/components/thread/PostCard.tsx`, `frontend/components/thread/Composer.tsx`

---

#### M04 · Follow Graph
- [ ] Follow a user
- [ ] Unfollow a user
- [ ] Get followers list (`/users/:id/followers`)
- [ ] Get following list (`/users/:id/following`)
- [ ] Mutual followers count
- [ ] Follow suggestions (users followed by people you follow)
- [ ] Is-following status on profile view

**Key files**: `backend/src/modules/follows/`

---

#### M05 · Home Feed
- [ ] For You feed (default — algorithmic/popular)
- [ ] Following feed (reverse-chronological from followed users)
- [ ] **Sticky tab bar** with blur backdrop (For You / Following)
- [ ] **Skeleton loading** (shimmer animation) on mount + tab switch, clears after 650ms
- [ ] **"See new posts" pill** — appears after 5s of idling, scrolls to top and refreshes
- [ ] Infinite scroll pagination (cursor-based, not offset)
- [ ] Pull-to-refresh on mobile
- [ ] Empty state (no follows → "Follow more people" message)
- [ ] "You're all caught up ✦" footer after all posts shown

**Key files**: `backend/src/modules/feed/`, `frontend/app/(home)/page.tsx`

---

#### M06 · Reactions (Like, Repost, Save, Share)
- [ ] Like a thread (tap) → heart fills, count increments
- [ ] Unlike a thread
- [ ] **Double-tap** anywhere on post → like with full-screen heart burst animation
- [ ] **Bounce animation** on like button tap
- [ ] Repost with context menu: "Repost" (one-click) or "Quote" (with text)
- [ ] Undo repost → toast "Removed repost"
- [ ] **Save / Bookmark** a thread → toast "Saved" / "Removed from saved"
- [ ] **Share** → copy link to clipboard → toast "Link copied"
- [ ] Like/repost/reply counts on thread card
- [ ] Liked-by list (`/threads/:id/likes`)
- [ ] Toast feedback system (`app-toast` CustomEvent → fixed-position toast strip)

**Key files**: `backend/src/modules/reactions/`, `frontend/components/ui/Toast.tsx`

---

#### M07 · Replies (Threaded Conversations)
- [ ] Inline reply composer in ThreadView (avatar + textarea + Post button on Enter)
- [ ] Reply to a thread (creates child thread with `parent_id`)
- [ ] Nested replies (reply to a reply, up to 3 levels) — indented with thread line
- [ ] Thread detail page: full post + stats bar (reposts / likes / replies) + action row + replies
- [ ] Reply count on thread card
- [ ] Delete own reply
- [ ] **Reply approvals** — author can require approval before a reply appears publicly
- [ ] Reply approval queue (approve / deny)
- [ ] "View more replies" pagination

**Key files**: `backend/src/modules/threads/` (parent_id field), `frontend/app/threads/[id]/page.tsx`

---

### PHASE 2 — Discovery & Notifications

#### M08 · Activity & Notifications
- [ ] Like notification → type icon ♥ red badge
- [ ] Follow notification → type icon ＋ blue badge
- [ ] Reply notification → type icon ↩ purple badge
- [ ] Repost notification → type icon ↻ green badge
- [ ] Mention notification → type icon @ amber badge
- [ ] **Activity filter tabs**: All / Mentions / Follows
- [ ] Unread indicator (dot on right + blue highlighted row)
- [ ] "X new" count in Activity header
- [ ] Real-time delivery via WebSocket (Socket.io)
- [ ] Mark as read (single + mark all read)
- [ ] Notification bell badge in nav (red count bubble)
- [ ] Notification preferences (per-type on/off) → links to M13 Settings

**Key files**: `backend/src/modules/notifications/`, `workers/notification/`

---

#### M09 · Search & Discovery
- [ ] Search bar always focused on enter (autofocus)
- [ ] Live user search by name/handle as you type (debounced)
- [ ] Search results show avatar, name, handle, follower count, Follow button
- [ ] **Trending page** shown when query is empty (numbered trending topics: rank · "Trending" · count)
- [ ] Full-text search for threads (PostgreSQL `tsvector`)
- [ ] Hashtag/topic search
- [ ] Clear query button (×) in search bar
- [ ] "No results for X" empty state

**Key files**: `backend/src/modules/search/`, `frontend/app/search/page.tsx`

---

#### M10 · Hashtags & Mentions
- [ ] Parse `#hashtag` in thread text on save
- [ ] Parse `@mention` in thread text on save
- [ ] Hashtag feed page (`/tags/:hashtag`)
- [ ] Mention autocomplete in compose box
- [ ] Mention links in rendered thread text
- [ ] Mention triggers notification (→ M08)

**Key files**: `backend/src/modules/hashtags/`, `backend/src/modules/mentions/`

---

### PHASE 3 — Safety, Settings & Media

#### M10b · Direct Messages *(was listed as gap — now a full module)*
- [ ] DM list page — conversation list, unread count badge, last message preview, timestamp
- [ ] Unread DMs badge in nav bar (red count bubble)
- [ ] Chat view — message bubbles (right = me / left = them), avatar for other party
- [ ] Send message (Enter key or send button, enabled when text non-empty)
- [ ] Unread highlight on DM list row
- [ ] Back navigation from chat to list
- [ ] Ghost post replies land here (per design spec)

**Key files**: `backend/src/modules/messages/`, `frontend/app/messages/page.tsx`

---

#### M11 · Media Processing
- [ ] Accept upload → store raw in MinIO
- [ ] Compress images (WebP conversion via Sharp)
- [ ] Generate image thumbnails
- [ ] Extract video thumbnail
- [ ] Enforce limits: images **10MB** each, video **5 min** / **500MB**
- [ ] Support up to **20 media items** per post (images + videos combined)
- [ ] Alt text input for accessibility
- [ ] Media carousel UI (swipe/arrow navigation when >1 image)
- [ ] CDN URL generation (MinIO presigned → Cloudflare cached)

**Key files**: `workers/media/`, `backend/src/modules/media/`

---

#### M12 · Moderation & Safety
- [ ] Block user (hides their content from you)
- [ ] Unblock user
- [ ] Mute user (you don't see their threads, they can still see yours)
- [ ] Mute word/phrase
- [ ] Report thread (reason + optional note)
- [ ] Report user
- [ ] Hidden words filter on compose (warn before post)
- [ ] Blocked accounts list in settings

**Key files**: `backend/src/modules/moderation/`

---

#### M13 · Settings & Privacy
- [ ] Private account toggle (follows require approval)
- [ ] Follow request approval (approve/deny)
- [ ] Who can reply to your threads (everyone / following / mentioned)
- [ ] Hide like counts on your threads
- [ ] Change email
- [ ] Change password
- [ ] Delete account (30-day grace period, then hard delete)

**Key files**: `backend/src/modules/settings/`, `frontend/app/settings/`

---

#### M14 · Admin Panel (Internal)
- [ ] User list with search/filter
- [ ] View any user's threads
- [ ] Suspend / unsuspend account
- [ ] Review reported content queue
- [ ] Approve/reject report → action on content
- [ ] Basic platform metrics (DAU, thread count, etc.)

**Key files**: `frontend/app/admin/` (protected by admin role)

---

#### M16 · Frontend Shell & Theming *(new — not in original plan)*
- [ ] **Theme system**: Dark (default) / Light / Warm — CSS custom properties (`--bg`, `--text`, `--accent`, etc.)
- [ ] Theme persisted to localStorage, applied via `data-theme` attribute on `<html>`
- [ ] **Layout system**: Mobile (bottom nav) / Desktop (sidebar + feed + right panel) / Auto (≥900px)
- [ ] Desktop sidebar: nav items + "New thread" CTA button + user handle footer
- [ ] Desktop right panel: search bar + Trending widget + Suggested users widget
- [ ] Mobile: sticky top logo bar + fixed bottom nav + content scroll area
- [ ] **Nav items**: Home / Search / Compose / Activity / Messages / Profile (with avatar)
- [ ] Badge counts on Activity (notifications) and Messages (unread DMs) nav items
- [ ] Tweaks panel (⚙ button) — switches theme + layout in prototype; maps to Settings in production
- [ ] Toast system: `app-toast` CustomEvent → ToastHost → fixed strip of toasts, auto-dismiss 2.4s
- [ ] **Skeleton / shimmer** loading states: avatar circle + text lines with `shimmer` keyframe animation
- [ ] Logo SVG component (Threads @-swirl)
- [ ] Icon library: Home, Search, Compose, Heart, Chat, Repeat, Share, User, Bell, Message, Back, More, Close, Img, Bookmark, Link, Globe, Check, Send, Poll, Ghost, VBadge
- [ ] Number formatter `fmtN` (1200 → "1.2K", 1200000 → "1.2M")
- [ ] `@keyframes`: `slideUp`, `toastIn`, `heartPop`, `shimmer`

**Key files**: `frontend/components/ui/`, `frontend/app/layout.tsx`, `frontend/stores/theme.ts`

---

#### M17 · Communities *(from design chat — Phase 4)*
- [ ] Browse communities by topic/interest
- [ ] Community page (name, description, members count, posts)
- [ ] Join / leave community
- [ ] Post within a community
- [ ] **Community champion badges** for highly active members
- [ ] **Flair labels** (member-assignable)
- [ ] **Live Chat sessions** — moderator sets name, photo, start/end time
- [ ] Community-specific "Like" emoji customization
- [ ] Non-members can view and engage (public communities)
- [ ] Community memberships shown on user profile

**Key files**: `backend/src/modules/communities/`, `frontend/app/communities/`

---

#### M18 · Insights & Analytics *(from design chat — Phase 4)*
- [ ] Creator Insights dashboard (protected, own account only)
- [ ] Post views, like, reply, repost counts over time
- [ ] **Performance chart** — 7 / 30 / 90 day range selector
- [ ] Follower growth with geographic data (cities, countries)
- [ ] Demographic breakdown (age, gender)
- [ ] **Content discovery sources** — where posts were seen (Threads, Instagram, Facebook)
- [ ] **Weekly Insights recap** — week-over-week Δ in posts / views / followers / replies
- [ ] Link click tracking per post

**Key files**: `backend/src/modules/analytics/`, `frontend/app/insights/page.tsx`

---

### PHASE 4 — Infrastructure & Ops

#### M15 · Infrastructure / DevOps
- [ ] `docker-compose.yml` for all services (api, web, db, redis, minio, nginx)
- [ ] Nginx config (reverse proxy + SSL termination)
- [ ] Cloudflare DNS + SSL setup docs
- [ ] Environment variable management (`.env.example` per app)
- [ ] Prisma migrations workflow (dev → prod)
- [ ] Database backup script (cron → MinIO)
- [ ] Health check endpoints (`/health`, `/ready`)
- [ ] Log aggregation (Winston → JSON files → optional Loki)
- [ ] Prometheus metrics endpoint + Grafana dashboard
- [ ] Deployment runbook (pull → migrate → restart)

**Key files**: `infra/`, `backend/src/modules/health/`

---

## Database Schema (Key Tables)

```sql
-- Core tables (simplified for overview)
users            (id, email, username, display_name, bio, avatar_url, is_private, role, created_at)
user_profiles    (user_id, website, location, verified_at)
sessions         (id, user_id, refresh_token_hash, expires_at)
follows          (follower_id, following_id, status[pending|accepted], created_at)
blocks           (blocker_id, blocked_id, created_at)
mutes            (muter_id, muted_id, created_at)

threads          (id, author_id, text, parent_id[nullable], root_id[nullable], 
                  status[active|deleted], reply_to_setting, like_count, 
                  reply_count, repost_count, created_at)
thread_media     (id, thread_id, url, type[image|video], alt_text, order, created_at)
thread_likes     (user_id, thread_id, created_at)
thread_reposts   (user_id, thread_id, created_at)
thread_quotes    (id, user_id, thread_id, quote_text, created_at)

hashtags         (id, tag, thread_count)
thread_hashtags  (thread_id, hashtag_id)
mentions         (id, thread_id, mentioned_user_id)

notifications    (id, recipient_id, actor_id, type, entity_id, entity_type, 
                  read_at[nullable], created_at)
reports          (id, reporter_id, target_type, target_id, reason, status, created_at)
```

---

## API Design Overview

**Base URL**: `https://yourdomain.com/api/v1`

**Auth**: Bearer token (JWT) in `Authorization` header. Refresh via `POST /auth/refresh`.

**Pagination**: All list endpoints use cursor-based pagination:
```json
{ "data": [...], "nextCursor": "base64string", "hasMore": true }
```

**Error format** (RFC 7807):
```json
{ "statusCode": 404, "error": "Not Found", "message": "Thread not found" }
```

**Key endpoints by module**:
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
DELETE /auth/logout

GET    /users/:username
PATCH  /users/me
POST   /users/me/avatar

POST   /threads
GET    /threads/:id
DELETE /threads/:id
GET    /threads/:id/replies

GET    /feed/following
GET    /feed/for-you

POST   /threads/:id/like
DELETE /threads/:id/like
POST   /threads/:id/repost
DELETE /threads/:id/repost

POST   /users/:id/follow
DELETE /users/:id/follow
GET    /users/:id/followers
GET    /users/:id/following

GET    /notifications
PATCH  /notifications/read-all

GET    /search?q=&type=threads|users|tags

POST   /reports
POST   /users/:id/block
DELETE /users/:id/block
```

Full OpenAPI spec will live in `docs/api/openapi.yaml` (auto-generated by NestJS Swagger).

---

## PM Manual Test Checklist (Per Module)

Use these to verify each module before marking it done. Test in Chrome (desktop) + mobile viewport.

### M01 · Auth
- [ ] Register with a new email → receive verification email → click link → account active
- [ ] Try registering with same email → see "email already in use" error
- [ ] Login with correct credentials → land on home feed
- [ ] Login with wrong password → see error, account NOT locked on first attempt
- [ ] Logout → redirected to login → back button does not show protected page
- [ ] Forgot password → email arrives → link works → can set new password → old password rejected
- [ ] JWT expires → refreshing page auto-renews session without re-login

### M02 · User Profiles
- [ ] Visit `/yourUsername` — see bio, avatar, thread count
- [ ] Edit bio + display name → save → changes appear immediately on profile
- [ ] Upload new avatar (PNG, JPG) → appears on profile + thread cards
- [ ] Try username already taken → see availability error inline
- [ ] Visit someone else's profile → edit button NOT visible

### M03 · Threads (Post)
- [ ] Compose a text thread → post → appears on your profile and home feed
- [ ] Compose with 1 image → image appears in thread card
- [ ] Compose with 20 images → all appear in carousel, swipeable
- [ ] Try posting >500 characters → SVG char-ring turns red → count shows negative → Post button disabled
- [ ] Toggle **Ghost post** → indicator appears ("disappears in 24h") → post shows ghost badge in feed
- [ ] After 24h a ghost post is auto-archived → no longer visible to others → replies came to DMs
- [ ] Add a **poll** (2 options) → post → other users can vote → live % bars appear after voting
- [ ] Add a 3rd or 4th poll option using "+ Add option"
- [ ] Schedule a post → appears in Scheduled drafts → publishes at set time
- [ ] Save to drafts → retrieve from drafts → complete and post
- [ ] **Edit** own post within 15 min → "edited" label appears
- [ ] Try to edit after 15 min → edit option gone
- [ ] Delete own thread → confirmation prompt → thread disappears from feed
- [ ] Try to delete someone else's thread → action not available

### M04 · Follow
- [ ] Follow a user → their threads appear in Following feed
- [ ] Unfollow → their threads disappear from Following feed
- [ ] Visit their profile → follower count updates
- [ ] Check your own Following list → they appear there

### M05 · Feed
- [ ] Home feed defaults to **For You** tab — shows popular/recommended threads
- [ ] Switch to **Following** tab → only threads from followed users appear
- [ ] On load → **skeleton cards shimmer** for ~650ms → real content fades in
- [ ] Idle for 5 seconds → **"See new posts" pill** appears (sticky, top of content area)
- [ ] Tap pill → scrolls to top + feed refreshes with skeleton then real content
- [ ] Scroll to bottom → new threads load automatically (infinite scroll, cursor-based)
- [ ] Pull down on mobile viewport → feed refreshes
- [ ] When all posts shown → "You're all caught up ✦" message at bottom
- [ ] Follow zero people → empty state "Follow more people to see their threads here"

### M06 · Reactions
- [ ] Tap Like → heart fills (red) → count increments → **bounce animation** on icon
- [ ] Tap Like again → heart empties → count decrements
- [ ] **Double-tap** anywhere on the post card → giant heart animation bursts in center → post is liked
- [ ] Tap Repost → context menu appears: "Repost" / "Quote" / "Cancel"
- [ ] Choose Repost → toast "Reposted" → count increments → icon turns green
- [ ] Tap Repost again (already reposted) → instantly removes, toast "Removed repost" → no menu
- [ ] Choose Quote → compose box opens with linked post → post quote → appears in feed
- [ ] Tap **Save** (bookmark icon) → turns filled → toast "Saved" → appears in Saved tab on profile
- [ ] Tap Save again → unfills → toast "Removed from saved"
- [ ] Tap **Share** → toast "Link copied to clipboard"
- [ ] Toast disappears automatically after ~2.4s

### M07 · Replies
- [ ] Reply to a thread → appears below it in thread detail
- [ ] Reply to that reply (nested) → appears indented/chained
- [ ] Reply count on thread card updates
- [ ] Delete own reply → disappears from chain

### M08 · Activity & Notifications
- [ ] Someone likes your thread → notification appears within ~2s (WebSocket) → red ♥ badge
- [ ] Someone follows you → notification with ＋ blue badge
- [ ] Someone replies → notification with ↩ purple badge, shows snippet of reply
- [ ] Someone reposts your thread → ↻ green badge
- [ ] Someone mentions you → @ amber badge
- [ ] Activity page: **All** filter shows all types in reverse-chronological order
- [ ] Switch to **Mentions** filter → only replies + mentions shown
- [ ] Switch to **Follows** filter → only new followers shown
- [ ] Unread notifications have blue highlighted row + dot indicator on right
- [ ] "X new" count in Activity header reflects unread count
- [ ] Nav bell icon shows red bubble with unread count
- [ ] Mark all read → all highlights clear, badge disappears
- [ ] Turn off a notification type in Settings → no longer receive it

### M09 · Search
- [ ] Search for a username → matching users appear
- [ ] Search for a word → matching threads appear
- [ ] Search for `#hashtag` → hashtag page opens
- [ ] Empty search results shows "No results" not a blank page

### M10 · Hashtags & Mentions
- [ ] Post a thread with `#topic` → hashtag is clickable → leads to hashtag feed
- [ ] Post with `@username` → that user gets a mention notification
- [ ] Typing `@` in compose → autocomplete suggestions appear

### M11 · Media
- [ ] Upload a 9MB image → uploads successfully, shows compressed version
- [ ] Upload an 11MB image → error: "Image too large"
- [ ] Upload a 90MB video → uploads and processes (thumbnail shown)
- [ ] Add alt text to image → appears in HTML (screen reader accessible)

### M12 · Moderation
- [ ] Block a user → their threads disappear from your feed
- [ ] Visit their profile → see "Blocked" state
- [ ] Report a thread → confirmation shown → report goes to admin queue
- [ ] Add muted word → threads containing that word are hidden

### M13 · Settings
- [ ] Set account to private → a new user cannot see your threads without following you
- [ ] Follow request arrives → approve → follower can now see threads
- [ ] Change password → old password no longer works → new one does

### M10b · Direct Messages
- [ ] Messages nav icon shows red bubble with unread DM count
- [ ] DM list shows avatar, name, last message preview, timestamp
- [ ] Unread conversations have bold text + highlighted row
- [ ] Tap a conversation → chat view opens with message bubbles
- [ ] My messages appear right-aligned (accent color bubble)
- [ ] Their messages appear left-aligned (bg2 color bubble) with avatar
- [ ] Type message + Enter → message appears immediately at bottom
- [ ] Send button enabled only when text is non-empty
- [ ] Back button returns to DM list

### M16 · Themes & Layout
- [ ] Default theme is **Dark** (dark background, light text)
- [ ] Switch to **Light** → white background, dark text — all components update instantly
- [ ] Switch to **Warm** → cream background, amber accents
- [ ] Theme preference survives page reload (localStorage)
- [ ] On **wide screen (≥900px)** → Desktop layout: sidebar on left, feed in center, right panel
- [ ] Desktop right panel shows Trending topics + Suggested users
- [ ] On **narrow screen (<900px)** → Mobile layout: logo top bar, content scroll, bottom nav
- [ ] **Auto** mode: automatically switches based on window width
- [ ] Skeleton shimmer animation visible during loading
- [ ] Toast strip appears bottom-center with correct icon and message, fades after 2.4s

### M14 · Admin
- [ ] Log in as admin → `/admin` is accessible; as regular user → 403
- [ ] View pending reports queue → approve one → thread is removed
- [ ] Suspend user → they cannot log in → see "suspended" message

### M15 · Infra / Ops
- [ ] `docker compose up -d` on Pi → all services healthy within 60s
- [ ] `GET /api/health` returns 200 with all dependencies green
- [ ] Simulate restart (`docker compose restart api`) → app recovers, no data loss
- [ ] Backup script runs → backup file appears in MinIO `backups/` bucket

---

## Documentation Plan

```
docs/
├── api/
│   └── openapi.yaml            # Auto-generated from NestJS; view via Swagger UI at /api/docs
│
├── architecture/
│   ├── 001-stack-choices.md    # Why Next.js + NestJS + Postgres
│   ├── 002-data-model.md       # ER diagram + key decisions (e.g., why cursor pagination)
│   ├── 003-realtime.md         # Socket.io pub/sub design (Redis adapter)
│   └── 004-media-pipeline.md   # Upload → MinIO → Worker → CDN URL flow
│
├── usecases/
│   ├── UC01-post-thread.md     # Actor, preconditions, steps, postconditions, API calls
│   ├── UC02-follow-user.md
│   ├── UC03-receive-notification.md
│   └── ...                     # One file per significant user journey
│
└── pm-testplans/
    └── [same checklist as above, one file per module]
```

**Use case document template**:
```markdown
# UC01 · Post a Thread

**Actor**: Authenticated user
**Goal**: Share a thought with followers

## Happy Path
1. User opens compose box
2. Types text (≤500 chars), optionally attaches media
3. Taps Post → `POST /api/v1/threads`
4. Thread appears in their profile and followers' feeds

## API Call
POST /api/v1/threads
Authorization: Bearer <token>
{ "text": "Hello world", "mediaIds": ["uuid1"] }

## Edge Cases
- Text > 500 chars → 422 Unprocessable Entity
- Media not yet uploaded → 400 Bad Request
- Unauthenticated → 401 Unauthorized
```

---

## Implementation Order (Recommended)

| Sprint | Modules | Goal |
|--------|---------|------|
| 1 (2w) | **M15** Infra + **M01** Auth + **M02** Users + **M16** Frontend Shell/Themes | Deployable skeleton, login works, themes work |
| 2 (2w) | **M03** Threads + **M04** Follow + **M05** Feed (with skeleton + pill) | Core social loop running |
| 3 (1w) | **M06** Reactions (like/repost/save/share/toasts) + **M07** Replies | Engagement features done |
| 4 (2w) | **M08** Notifications + **M09** Search + **M10** Hashtags/Mentions + **M10b** DMs | Discovery, alerts, messaging |
| 5 (2w) | **M11** Media (20 items, 5-min video) + **M12** Moderation + **M13** Settings | Safety & polish |
| 6 (2w) | **M17** Communities + **M18** Insights | Social features + creator tools |
| 7 (1w) | **M14** Admin + metrics dashboard | Ops visibility |

**Total: 18 modules, 11 pages, ~80+ functions**

---

## Things Your Plan Is Currently Missing (Suggestions)

| Gap | Recommendation |
|-----|---------------|
| **Direct Messages (DMs)** | Threads has DMs via Instagram integration; for standalone clone, add as Phase 5 |
| **Push notifications** (mobile) | Web Push API for browser notifications when tab is closed |
| **Email digest** | Weekly "you missed X" email (add email-worker to Phase 4) |
| **Rate limiting** | Per-user API rate limits (NestJS ThrottlerModule + Redis store) |
| **Audit log** | Admin action log (who banned/unbanned, when) — important for compliance |
| **GDPR / Data export** | User can download all their data (required in EU) |
| **A/B testing hooks** | Even a simple feature-flag table lets you test feed algorithms |
| **CDN for static assets** | Cloudflare R2 + Cloudflare CDN for frontend assets (not just media) |
| **Accessibility (a11y)** | keyboard navigation, aria-labels, colour contrast — add to PM test plans |
| **i18n** | If non-English users expected, Next.js i18n routing from day one is easier |

---

## Project Location

```
C:\Users\dattr\OneDrive\Desktop\code\2026\thread-clone\
├── Frontend\
├── Backend\
├── docs\
├── infra\
└── PLAN.md     ← copy of this plan file, kept in the project root
```

## First Action When Implementation Starts

```bash
# The project root already exists at:
cd "C:\Users\dattr\OneDrive\Desktop\code\2026\thread-clone"

# --- Backend (NestJS + Prisma + Bull workers) ---
npx @nestjs/cli new Backend --package-manager pnpm --strict
cd Backend
pnpm add @prisma/client @nestjs/jwt @nestjs/config @nestjs/bull bullmq \
         class-validator class-transformer ioredis @nestjs/swagger \
         @nestjs/websockets @nestjs/platform-socket.io socket.io \
         @aws-sdk/client-s3 sharp
pnpm add -D prisma @types/multer
npx prisma init
cd ..

# --- Frontend (Next.js 15) ---
npx create-next-app@latest Frontend --typescript --tailwind --app \
  --import-alias "@/*" --use-pnpm
cd Frontend
pnpm add zustand @tanstack/react-query zod socket.io-client \
         @radix-ui/react-dialog @radix-ui/react-tabs clsx tailwind-merge
cd ..

# --- Supporting folders ---
mkdir -p docs/api docs/architecture docs/usecases docs/pm-testplans
mkdir -p infra/nginx infra/monitoring

# Each folder gets a CLAUDE.md before implementation starts (Sprint 1 task)
# docker-compose.yml lives in infra/ and is also Sprint 1
```

Each folder has its own `CLAUDE.md` explaining its purpose, tech stack, key conventions, and which modules are already implemented. Claude reads this before making any changes to that folder.
