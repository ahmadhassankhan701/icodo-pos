# POS Platform

Multi-tenant point-of-sale system with offline sales, inventory, HR, accounting, and platform administration. Arabic-first UI with English support.

**App code lives in [`system/`](system/).** Deployment details: [`system/VERCEL.md`](system/VERCEL.md).

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, PWA, Dexie (offline) |
| Backend | Express, Prisma, JWT |
| Database | PostgreSQL |
| Hosting | Vercel (optional) |

## Prerequisites

- **Node.js 20+** (`node -v`)
- **[Supabase](https://supabase.com)** PostgreSQL (recommended) or local PostgreSQL

## Quick start (local development)

### 1. Install dependencies

```bash
cd system
npm run install:all
```

### 2. Environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → Database → Connect** and copy:
   - **Session pooler** or **Direct** URI → `DATABASE_URL` (local dev)
   - **Direct** URI → `DIRECT_URL` (Prisma migrations)
   - **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
3. Replace `[YOUR-PASSWORD]` in the connection strings with your database password (URL-encode special characters: `@` → `%40`).

Edit `system/server/.env`:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
SUPABASE_URL="https://PROJECT_REF.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
JWT_SECRET="use-a-long-random-string-here"
PLATFORM_ADMIN_EMAILS="platform@petstore.local"
```

Edit `system/client/.env`:

```env
VITE_SUPABASE_URL="https://PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

For local dev, `VITE_API_URL` is not needed — Vite proxies `/api` to the backend.

Optional: `ORG_REGISTRATION_SECRET`, `PUBLIC_IMAGE_BASE_URL`, `EZOO_GET_PRODUCTS_URL`, `VITE_IMAGE_URL_PREFIX`.

### 3. Database setup

```bash
cd system

# Apply migrations
npm run db:migrate --prefix server

# Seed demo organization, users, and sample products
npm run db:seed --prefix server
```

Use `npm run db:push --prefix server` only for quick experiments (skips migration history).

### 4. Run the app

Use two terminals:

**API (port 4000):**

```bash
cd system/server
npm run dev
```

**UI (port 5173):**

```bash
cd system/client
npm run dev
```

Open http://localhost:5173

### 5. Verify

| URL | Expected |
|-----|----------|
| http://localhost:5173 | Login page |
| http://localhost:4000/api/health | `{"ok":true,...}` |
| http://localhost:4000/api/health/db | DB connection status |

### Demo accounts (after seed)

| Email | Password | Role |
|-------|----------|------|
| `admin@petstore.local` | `admin123` | Organization admin |
| `platform@petstore.local` | `platform123` | Platform admin |
| `cashier@petstore.local` | `cashier123` | Cashier |

**Change these before any real deployment.**

## Project structure

```
POS/
├── README.md              ← this file
├── package.json           ← Vercel deploy helper (root)
└── system/
    ├── client/            ← React SPA + PWA
    ├── server/            ← Express API + Prisma
    ├── api/               ← Vercel serverless entry
    ├── vercel.json
    └── VERCEL.md          ← production deploy (Arabic)
```

## Features overview

- **POS** — retail checkout, held carts, receipts, print settings
- **Offline mode** — sales queue locally, sync when online
- **Inventory** — products, purchases, transfers, stock counts, expiry (FEFO)
- **Customers** — loyalty, coupons, accounts receivable
- **Operations** — returns, cash sessions, multi-branch, audit log
- **Back office** — reports, accounting, expenses, zakat
- **HR** — employees, payroll, loans
- **Verticals** — grocery, restaurant, pharmacy, pet store, etc. (feature gating)
- **Platform admin** — manage organizations and users (`/platform`)

## Production deployment (Vercel)

From repo root:

```bash
npm run vercel:prod
```

Set **Root Directory** to `system` in the Vercel project settings. Required env vars: `DATABASE_URL`, `JWT_SECRET`. See [`system/VERCEL.md`](system/VERCEL.md).

Run migrations against production separately:

```bash
npm run db:deploy --prefix system/server
```

## Common issues

| Problem | Fix |
|---------|-----|
| `/api/*` returns 404 on Vercel | Root Directory must be `system`, not `system/client` |
| DB errors on Vercel | Use Supabase **transaction pooler** (port 6543) in `DATABASE_URL` |
| Client can't reach API locally | Start the server on port 4000; Vite proxy is configured in `client/vite.config.js` |
| Offline POS empty | Open `/pos` once while online to cache products |
| `prisma generate` fails | Run from `system/`: `npm run install:all` |

## Scripts reference

From `system/`:

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install deps + Prisma generate |
| `npm run db:migrate --prefix server` | Apply migrations (dev) |
| `npm run db:deploy --prefix server` | Apply migrations (production) |
| `npm run db:seed --prefix server` | Seed demo data |
| `npm run build:vercel` | Build client for Vercel |

## Security checklist (before handoff)

- [ ] Replace all seed passwords
- [ ] Set a strong `JWT_SECRET`
- [ ] Set `ORG_REGISTRATION_SECRET`; disable public org registration in production
- [ ] Configure `PLATFORM_ADMIN_EMAILS`
- [ ] Never commit `.env` files
- [ ] Run `db:deploy` on production after schema changes

## License

Private — confirm licensing with the original author before redistribution.
