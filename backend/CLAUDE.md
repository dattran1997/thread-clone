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

## Implemented modules (update as you build)
- [ ] auth
- [ ] users
- [ ] threads
- [ ] follows
- [ ] feed
- [ ] reactions
- [ ] notifications
- [ ] search
- [ ] hashtags
- [ ] mentions
- [ ] messages
- [ ] media
- [ ] moderation
- [ ] settings
- [ ] communities
- [ ] analytics
- [ ] admin
- [ ] health

## Important files
- `prisma/schema.prisma` — the ONLY place DB schema is defined
- `src/app.module.ts` — wire new modules here
- `src/common/guards/jwt-auth.guard.ts` — apply to all protected routes
- `src/common/filters/http-exception.filter.ts` — global error shaping
