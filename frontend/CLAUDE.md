# Frontend — Threads Clone UI

## What this is
Next.js 15 (App Router) frontend for the Threads clone project.  
Paired with `../backend` (NestJS API on port 3001).

## Stack
- **Framework**: Next.js 15 App Router (TypeScript strict)
- **Styling**: Tailwind CSS v4 + `clsx` + `tailwind-merge` (`cn()` utility)
- **State**: Zustand (global) + TanStack Query (server state + caching)
- **Validation**: Zod (API response schemas)
- **Real-time**: Socket.io client (singleton in `lib/ws.ts`)
- **UI primitives**: Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-tabs`)

## Shared types
All TypeScript types shared between frontend and backend live in `../shared/types/`.
Import them using the `@shared/*` path alias (wired in `tsconfig.json`):
```ts
import type { Thread, CreateThreadDto } from "@shared/types";
import type { UserSummary }             from "@shared/types/user";
```
**Never re-declare** a type that already exists in `@shared/types`. If you need a new shared shape, add it there first.

## Key conventions
- **Server Components by default** — only add `"use client"` when you need interactivity or browser APIs
- **Named exports only** — no default exports anywhere
- **`cn()` for class merging** — always use `cn()` from `lib/utils.ts` instead of string concatenation
- **API calls go through `lib/api.ts`** — never call `fetch` directly in components
- **Zod schemas** live beside the API call that uses them — validate every API response
- **Zustand stores** are in `stores/` — one store per domain (auth, theme, notifications)
- **Feature components** live in `components/thread/`, shared UI in `components/ui/`, layout in `components/shell/`

## Theme system
Three CSS themes via `data-theme` on `<html>`:
- `dark` (default): `--bg: #101010`, `--text: #f0f0f0`, `--accent: #f0f0f0`
- `light`: `--bg: #ffffff`, `--text: #0d0d0d`, `--accent: #0d0d0d`
- `warm`: `--bg: #fdf8f0`, `--text: #1c1309`, `--accent: #c05a10`

Always use CSS variables (`var(--bg)`, `var(--text)`, `var(--accent)`) — never hardcode colors.

## Layout system
- **Mobile** (`< 900px`): sticky top logo bar + scrollable content + fixed bottom nav
- **Desktop** (`≥ 900px`): sidebar (252px) + center feed (max 622px) + right panel (310px)
- Auto-switches via window resize listener in root layout

## Running locally
```bash
# Make sure backend is running on port 3001 first
# Create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:3001
# NEXT_PUBLIC_WS_URL=http://localhost:3001

npm run dev   # starts on port 3000
```

## Pages (App Router)
```
app/
  layout.tsx          — root layout: theme, shell, nav, toast host
  (auth)/             — login, register, forgot-password (no nav)
  (home)/page.tsx     — home feed (For You / Following tabs)
  [username]/page.tsx — public profile
  threads/[id]/       — thread detail + replies
  search/             — search + trending
  activity/           — notifications
  messages/           — DM list + chat
  communities/        — communities
  insights/           — creator analytics
  settings/           — user settings
  admin/              — admin panel (role-guarded)
```

## Implemented modules (update as you build)
- [ ] M16 Shell & Themes (layout, nav, toast, skeleton)
- [ ] M01 Auth pages
- [ ] M02 Profile page
- [ ] M03 Thread composer + PostCard
- [ ] M05 Feed page
- [ ] M06 Reactions (like/repost/save/share)
- [ ] M07 Thread detail + replies
- [ ] M08 Activity page
- [ ] M09 Search page
- [ ] M10b Messages page
- [ ] M13 Settings page
- [ ] M17 Communities page
- [ ] M18 Insights page
- [ ] M14 Admin page
