# Threads Clone

A full-featured clone of Meta Threads — text-first social platform with threaded replies, real-time notifications, direct messages, polls, media uploads, and communities.

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 + `clsx` / `tailwind-merge` |
| Global state | Zustand (auth, theme, notifications) with `persist` to localStorage |
| Real-time | Socket.io client (singleton, `/notifications` namespace) |
| HTTP client | Custom fetch wrapper with automatic JWT refresh on 401 |
| Linting | ESLint + TypeScript strict |

### Backend
| Layer | Technology |
|---|---|
| Framework | NestJS 11 (TypeScript strict) |
| Database | PostgreSQL via Prisma ORM |
| Cache / Pub-sub | Redis (ioredis) |
| Real-time | Socket.io (two namespaces: `/notifications`, `/messages`) |
| Auth | JWT (15 min access token + 30-day refresh token rotation) |
| File storage | MinIO (S3-compatible) |
| Media processing | Sharp (image compression + WebP) |
| API docs | Swagger / OpenAPI at `/api/docs` |

### Infrastructure
| Component | Technology |
|---|---|
| Containerisation | Docker Compose |
| Reverse proxy | Nginx |
| Object storage | MinIO |
| Monitoring | Prometheus + Grafana |
| Target host | Raspberry Pi 5 (cloud-migratable) |

## Project Structure

```
thread-clone/
├── frontend/                   # Next.js 15 app (port 3000)
│   ├── app/                    # App Router pages
│   │   ├── page.tsx            # Home feed (For You / Following)
│   │   ├── [username]/         # Public profile
│   │   ├── threads/[id]/       # Thread detail + replies
│   │   ├── activity/           # Notifications
│   │   ├── messages/           # Direct messages
│   │   ├── search/             # Search + trending
│   │   ├── saved/              # Saved posts
│   │   ├── communities/        # Communities
│   │   ├── insights/           # Creator analytics
│   │   ├── settings/           # User settings
│   │   ├── admin/              # Admin panel (role-guarded)
│   │   └── (auth)/             # Login / register / forgot-password
│   ├── components/
│   │   ├── thread/             # PostCard, Composer, PollBlock
│   │   ├── shell/              # DesktopSidebar, MobileNav, WsProvider, Logo
│   │   └── ui/                 # Avatar, Toast, Skeleton, VBadge
│   ├── lib/
│   │   ├── api.ts              # Fetch wrapper + JWT auto-refresh
│   │   └── ws.ts              # Socket.io singleton
│   └── stores/
│       ├── auth.ts             # User + tokens (persisted)
│       ├── notifications.ts    # Unread bell + DM badge counts
│       └── theme.ts            # Dark / Light / Warm theme
│
├── backend/                    # NestJS 11 API (port 3001)
│   ├── prisma/
│   │   └── schema.prisma       # Single source of truth for DB schema
│   └── src/
│       ├── modules/
│       │   ├── auth/           # JWT auth, refresh token rotation
│       │   ├── users/          # Profiles, follow graph
│       │   ├── threads/        # Posts, replies, polls, ghost posts
│       │   ├── feed/           # For You + Following feeds
│       │   ├── reactions/      # Likes, reposts, saves, quotes
│       │   ├── notifications/  # Activity feed + WebSocket gateway
│       │   ├── messages/       # DM conversations + WebSocket gateway
│       │   ├── search/         # Full-text search + trending
│       │   ├── media/          # Upload → MinIO + Sharp processing
│       │   ├── communities/    # Communities + membership
│       │   ├── analytics/      # Creator insights
│       │   ├── settings/       # Privacy, password, sessions
│       │   ├── admin/          # User management, report queue
│       │   └── health/         # Health check endpoint
│       └── common/
│           ├── guards/         # JwtAuthGuard, RolesGuard
│           └── decorators/     # @CurrentUser(), @Roles()
│
├── infra/
│   ├── docker-compose.yml      # All services wired together
│   ├── nginx/nginx.conf        # Reverse proxy config
│   └── monitoring/             # Prometheus + Grafana
│
└── docs/
    ├── api/openapi.yaml        # Auto-generated OpenAPI spec
    └── architecture/           # ADRs and design docs
```

## Features

- **Authentication** — email/password login, JWT with silent refresh, persistent sessions
- **Threads** — text posts (500 chars), ghost posts (24 h auto-archive), edit within 15 min, topic tags
- **Media** — up to 20 images/videos per post, image compression, audio support
- **Polls** — 2–4 options, 24 h auto-close, live vote % bars, owner always sees results
- **Feed** — For You (algorithmic) + Following (chronological), infinite scroll, skeleton loading, "See new posts" pill
- **Reactions** — like (with double-tap burst), repost, quote repost, save/bookmark, share
- **Replies** — threaded conversations, real-time new replies via WebSocket, dedup guard
- **Notifications** — per-type badges (like/follow/reply/repost/mention), real-time via Socket.io, mark as read
- **Direct Messages** — conversation list, real-time chat, unread count badge in nav, delete conversation/message
- **Search** — live user search, full-text thread search, trending topics
- **Communities** — browse, join/leave, community posts
- **Insights** — creator analytics dashboard, 7/30/90-day range, bar chart
- **Themes** — Dark (default) / Light / Warm, persisted to localStorage
- **Admin** — user management, suspension, report review queue

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Node.js 20+

### Local development

```bash
# 1. Start infrastructure
cd infra && docker compose up -d db redis minio

# 2. Backend
cd ../backend
cp .env.example .env   # fill in values
npx prisma migrate dev
npm run start:dev       # → http://localhost:3001

# 3. Frontend (new terminal)
cd ../frontend
cp .env.local.example .env.local   # fill in values
npm run dev             # → http://localhost:3000
```

### Environment variables

**`backend/.env`**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/threads
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=threads
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### Full Docker stack (Raspberry Pi / production)

```bash
cd infra
docker compose up -d
# App available at http://localhost (Nginx)
```

## API

Swagger UI is available at `http://localhost:3001/api/docs` when the backend is running.

Base URL: `http://localhost:3001`  
Auth: `Authorization: Bearer <access_token>`

## Database

Prisma is the single source of truth. Migrations live in `backend/prisma/migrations/`.

```bash
# Create a migration after schema changes
cd backend && npx prisma migrate dev --name your_migration_name

# Reset the database (dev only)
npx prisma migrate reset
```

## GitHub

Repository: [https://github.com/dattran1997/thread-clone](https://github.com/dattran1997/thread-clone)
