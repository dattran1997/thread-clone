# Threads Clone — Project Root

## What this is
Full-featured clone of Meta Threads. Two independent apps:
- `frontend/` — Next.js 15 (port 3000)
- `backend/`  — NestJS 11 (port 3001)

Read `PLAN.md` for the full roadmap, module checklist, PM test plans, and architecture.

## Quick start (local dev)
```bash
# 1. Start infrastructure (DB + Redis + MinIO)
cd infra && docker compose up -d db redis minio

# 2. Backend
cd ../backend && npm run start:dev

# 3. Frontend (new terminal)
cd ../frontend && npm run dev
```

## Quick start (full Docker — Raspberry Pi)
```bash
cd infra
docker compose up -d
# Visit http://localhost (Nginx serves everything)
```

## Project layout
```
thread-clone/
├── frontend/   → Next.js 15 — read frontend/CLAUDE.md before touching
├── backend/    → NestJS 11  — read backend/CLAUDE.md before touching
├── docs/       → API spec, architecture ADRs, use cases, PM test plans
├── infra/      → docker-compose.yml, nginx.conf, monitoring
├── PLAN.md     → Full project plan & PM module checklist
└── CLAUDE.md   → This file
```

## Design reference
Original design prototype: `https://api.anthropic.com/v1/design/h/aQGTYaE_NyXkT32phJ9YQQ`  
Key file: `Threads Clone.html` — 7-component React prototype, pixel-perfect reference.

## Pending decisions (answer in PLAN.md when decided)
- [ ] Decision B: Create a `shared/` folder for TypeScript types shared between frontend/backend?
- [ ] Decision C: Confirmed lowercase folder names (frontend/ backend/) — good for Linux/Pi compatibility
