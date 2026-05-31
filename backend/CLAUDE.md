# Backend — Threads Clone API

## What this is
NestJS 11 REST API + WebSocket gateway for the Threads clone project.  
Paired with `../frontend` (Next.js 15).

## Stack
- **Framework**: NestJS 11 (TypeScript strict mode)
- **ORM**: Prisma + PostgreSQL
- **Auth**: JWT (access 15m + refresh 30d), bcrypt for passwords
- **Queue**: BullMQ + Redis for background jobs
- **Real-time**: Socket.io with Redis adapter
- **Storage**: MinIO (S3-compatible)
- **Docs**: Swagger auto-generated at `/api/docs`

## Shared types
All TypeScript types shared between frontend and backend live in `../shared/types/`.
Import them using the `@shared/*` path alias (wired in `tsconfig.json`):
```ts
import type { Thread, CreateThreadDto } from "@shared/types";
import type { UserSummary }             from "@shared/types/user";
```
**Never re-declare** a type that already exists in `@shared/types`. If you need a new shared shape, add it to the shared package first, then import it here.

> **Runtime note**: Path aliases are resolved at build time by NestJS CLI (`tsconfig-paths`).
> `@nestjs/cli` handles this automatically — no extra setup needed.

## Key conventions
- **One folder per module** in `src/modules/` — each has: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.dto.ts`
- **Named exports only** — no default exports anywhere
- **DTOs use class-validator** — all input validation is in DTOs, never in services
- **Error format**: RFC 7807 via `HttpExceptionFilter` in `src/common/filters/`
- **Auth**: Always use `@UseGuards(JwtAuthGuard)` on protected routes; get user via `@CurrentUser()` decorator
- **Pagination**: All list endpoints use cursor-based: `{ data, nextCursor, hasMore }`
- **Enums**: All string constants are TypeScript enums (e.g., `ThreadStatus.DELETED`)

## Running locally
```bash
# Start dependencies (PostgreSQL + Redis + MinIO)
docker compose -f ../infra/docker-compose.yml up -d db redis minio

# Run migrations
npx prisma migrate dev

# Start dev server (port 3001)
npm run start:dev
```

## Environment
Copy `.env.example` to `.env` and fill in values.  
`DATABASE_URL` must point to a running PostgreSQL instance.

## Implemented modules ✅
- [x] auth — register, login, refresh, logout (JWT rotation, bcrypt)
- [x] users — profile CRUD, avatar, followers/following, username check, deactivation
- [x] threads — CRUD, ghost (24h), polls, scheduling, drafts, 15-min edit, soft delete
- [x] follows — follow/unfollow (privacy-aware), suggestions
- [x] feed — for-you (popular) + following (reverse-chrono), cursor pagination
- [x] reactions — like/unlike, repost/unrepost, save/unsave, quote, likes list
- [x] notifications — CRUD, unread count, WebSocket gateway (Socket.io)
- [x] search — users, threads, tags (case-insensitive contains)
- [x] messages — DM conversations, send, start + WebSocket real-time
- [x] media — file upload endpoint (local /uploads/; swap to MinIO in production)
- [x] moderation — block/unblock, mute/unmute, reports
- [x] settings — isPrivate, password change, email change
- [x] communities — CRUD, join/leave, members list
- [x] analytics — InsightsSummary, PerformanceChart, ThreadInsight
- [x] admin — user search/suspend/unsuspend, reports queue, platform stats
- [x] health — GET /health returns DB + service status

## Next steps (production hardening)
- Run `npx prisma migrate dev --name init` to create the database
- Add BullMQ workers for notification fan-out, media processing, feed pre-computation
- Wire MinIO for media storage (replace local uploads)
- Add @nestjs/throttler rate limiting on auth endpoints
- Add Redis adapter to Socket.io for multi-instance scaling

## Important files
- `prisma/schema.prisma` — the ONLY place DB schema is defined
- `src/app.module.ts` — wire new modules here
- `src/common/guards/jwt-auth.guard.ts` — apply to all protected routes
- `src/common/filters/http-exception.filter.ts` — global error shaping
