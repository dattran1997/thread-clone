# ──────────────────────────────────────────────────────────────────────────────
# Threads Clone — Dev Startup Script
# Run from: C:\Users\dattr\OneDrive\Desktop\code\2026\thread-clone\
# Prerequisites: Docker Desktop must be running
# ──────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Write-Host ""
Write-Host "=== Threads Clone — Dev Startup ===" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Docker infra ──────────────────────────────────────────────────────
Write-Host "[1/5] Starting Docker services (PostgreSQL, Redis, MinIO)..." -ForegroundColor Yellow
Set-Location "$Root\infra"
docker compose up -d db redis minio

Write-Host "      Waiting 5s for services to be ready..."
Start-Sleep -Seconds 5

# ── Step 2: Prisma ────────────────────────────────────────────────────────────
Write-Host "[2/5] Generating Prisma client..." -ForegroundColor Yellow
Set-Location "$Root\backend"
npx prisma generate

Write-Host "[3/5] Running database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init

# ── Step 4: Backend ───────────────────────────────────────────────────────────
Write-Host "[4/5] Starting NestJS backend (port 3001) in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\backend'; npm run start:dev"

Start-Sleep -Seconds 3

# ── Step 5: Frontend ─────────────────────────────────────────────────────────
Write-Host "[5/5] Starting Next.js frontend (port 3000) in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\frontend'; npm run dev"

Write-Host ""
Write-Host "=== All services launching! ===" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:   http://localhost:3001/api/v1" -ForegroundColor White
Write-Host "  Swagger:   http://localhost:3001/api/docs" -ForegroundColor White
Write-Host "  MinIO UI:  http://localhost:9001  (user: minio_access_key / minio_secret_key)" -ForegroundColor White
Write-Host ""
Write-Host "Backend and frontend are opening in separate PowerShell windows." -ForegroundColor Gray
Write-Host "Wait ~10s for NestJS to finish compiling before opening the frontend." -ForegroundColor Gray
Write-Host ""
