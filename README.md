# 🍪 CookieGuard — Cookie Consent Management POC

> A full-stack proof-of-concept Cookie Consent Management dashboard. Scan websites for cookies, auto-classify them, configure a consent banner, embed it on any site, and view visitor consent records.

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ (tested on v20/v23)
- macOS / Linux

### 1. Install Dependencies

```bash
# Backend
npm install --prefix apps/backend

# Frontend
npm install --prefix apps/frontend
```

### 2. Setup the Database

```bash
# Run the DB migration (creates SQLite database at apps/backend/prisma/dev.db)
cd apps/backend
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed demo data (org, user, demo site + banner)
npx ts-node src/seed.ts
```

### 3. Install Playwright Browser

```bash
cd apps/backend
npx playwright install chromium
```

### 4. Environment Variables

The default `.env` file is pre-configured for local development:

**`apps/backend/.env`** (already created):
```env
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:3000"
SCANNER_MAX_PAGES=20
SCANNER_TIMEOUT_MS=30000
SCANNER_CRAWL_DEPTH=2
NODE_ENV=development
```

**`apps/frontend/.env.local`** (already created):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 5. Start the Application

**Terminal 1 — Backend:**
```bash
cd apps/backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd apps/frontend
npm run dev
```

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:4000
- **Embed Script**: http://localhost:4000/embed/banner.js
- **Demo Page**: http://localhost:3000/demo.html

### 6. Demo Login

```
Email:    demo@acmecorp.com
Password: password123
```

---

## 🏗️ Architecture

```
surePassAssignment/
├── apps/
│   ├── backend/          # Node.js + Express + Prisma + Playwright
│   │   ├── src/
│   │   │   ├── auth/         # JWT auth (register, login)
│   │   │   ├── sites/        # Site CRUD
│   │   │   ├── scans/        # Scan trigger + status
│   │   │   ├── scanner/      # Playwright headless crawler
│   │   │   ├── classifier/   # 4-tier cookie classifier
│   │   │   ├── cookies/      # Cookie inventory API
│   │   │   ├── banners/      # Banner config + versioning
│   │   │   ├── consent/      # Consent records + CSV export
│   │   │   ├── policy/       # Cookie policy generator
│   │   │   ├── health/       # System health + logs
│   │   │   └── embed/        # Public API for banner script
│   │   ├── public/
│   │   │   └── banner.js     # Embeddable consent banner script
│   │   └── prisma/
│   │       └── schema.prisma # Full data model
│   └── frontend/         # Next.js 14 + TypeScript + Vanilla CSS
│       ├── src/app/
│       │   ├── (dashboard)/  # Protected dashboard routes
│       │   │   ├── page.tsx            # Overview
│       │   │   ├── sites/              # Sites list
│       │   │   ├── sites/[id]/         # Site detail (5 tabs)
│       │   │   └── health/             # System health
│       │   └── login/        # Auth page
│       └── public/
│           └── demo.html     # Demo test page for embed
└── packages/
    └── shared/           # Shared TypeScript types
```

### Technology Choices

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SSR + simple routing |
| **Backend** | Express + TypeScript | Lightweight, flexible |
| **Database** | SQLite via Prisma | Zero setup, trivially switchable to Postgres |
| **Scanner** | Playwright (Chromium) | Captures JS-set cookies, real browser behavior |
| **Auth** | JWT + bcrypt | Simple, stateless, org-scoped |
| **CSS** | Vanilla CSS | Full control, no build step |

---

## 🔍 How Cookie Scanning Works

The scanner (`apps/backend/src/scanner/scanner.ts`) uses **Playwright headless Chromium**:

1. Accepts a domain and normalizes it to `https://domain.com`
2. Opens a browser context and visits the start URL
3. After each page load, waits 1.5s for JavaScript to execute and set cookies
4. Collects `context.cookies()` — this captures **all cookies** including JS-set ones
5. Intercepts response headers to catch `Set-Cookie` headers
6. Extracts same-site links and crawls them (up to `SCANNER_MAX_PAGES`, default 20)
7. Each page gets a 30s timeout (`SCANNER_TIMEOUT_MS`)
8. Records: name, domain, path, expiry, secure, httpOnly, sameSite, first/third-party
9. Persists all cookies with classification; **never stores cookie values**

### Crawl Limits

- Max pages per scan: **20** (configurable via `SCANNER_MAX_PAGES`)
- Page timeout: **30 seconds** (configurable via `SCANNER_TIMEOUT_MS`)
- Scope: same-hostname links only (no cross-domain crawling)

---

## 🧠 Classification Logic

The classifier (`apps/backend/src/classifier/classifier.ts`) uses a 4-tier rule engine:

| Tier | Source | Coverage | Confidence |
|---|---|---|---|
| 1 | Known-cookie database (60+ cookies) | _ga, _fbp, PHPSESSID, etc. | High |
| 2 | Name prefix/pattern rules (25 patterns) | csrf*, _hj*, __stripe*, session* | Medium–High |
| 3 | Domain/provider heuristics (22 domains) | doubleclick.net → Marketing | Medium |
| 4 | Duration + httpOnly heuristics | Session+httpOnly → Necessary | Low |
| 5 | Fallback | Everything else | Uncategorized |

**Categories**: Necessary · Functional · Analytics · Marketing · Uncategorized

**Key invariant**: Manual overrides by reviewers survive rescans. Only cleared if reviewer explicitly resets.

---

## 📦 Data Model

```
Organization → User[]
             → Site[]

Site → ScanRun[]
     → DiscoveredCookie[]
     → BannerConfig[]
     → ConsentRecord[]

ScanRun → ScanLog[]
         → CookieSeenInScan[]

DiscoveredCookie
  - autoCategory / autoConfidence / autoSource / autoReason
  - manualCategory / manualDescription / isManuallyReviewed  ← survives rescans
  - firstSeenAt / lastSeenAt / firstSeenScanId / lastSeenScanId

BannerConfig
  - version (bumps on each save)
  - isActive (only one active per site)

ConsentRecord
  - visitorId (anonymous UUID, stored by banner.js in localStorage)
  - action (accepted/rejected/customized)
  - categoriesAllowed (JSON array)
  - bannerConfigId + bannerVersion
  - ipHash (SHA-256 truncated — for privacy)
```

---

## 🌐 API Shape

All authenticated endpoints require `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create org + user |
| POST | `/api/auth/login` | Get JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/sites` | List sites |
| POST | `/api/sites` | Create site |
| GET | `/api/sites/:id` | Site detail |
| POST | `/api/scans/sites/:siteId/trigger` | Trigger scan |
| GET | `/api/scans/sites/:siteId` | Scan history |
| GET | `/api/scans/:scanId` | Scan + logs |
| GET | `/api/cookies/sites/:siteId` | Cookie inventory (search/filter/paginate) |
| PATCH | `/api/cookies/:id` | Inline edit |
| POST | `/api/cookies/:id/override` | Manual override |
| DELETE | `/api/cookies/:id/override` | Reset override |
| GET | `/api/banners/sites/:siteId` | Get banner config |
| PUT | `/api/banners/sites/:siteId` | Save banner (bumps version) |
| GET | `/api/banners/sites/:siteId/snippet` | Get embed snippet |
| GET | `/api/consent/sites/:siteId` | List consent records |
| GET | `/api/consent/sites/:siteId/export` | CSV export |
| GET | `/api/consent/sites/:siteId/stats` | Consent stats |
| GET | `/api/policy/sites/:siteId` | Generated cookie policy |
| GET | `/api/health` | System health |
| GET | `/api/public/banner/:siteId` | **No auth** — for embed script |
| POST | `/api/public/consent` | **No auth** — record consent event |

---

## 🎨 Consent Banner Embed

Install on any website:

```html
<script 
  src="http://localhost:4000/embed/banner.js" 
  data-site-id="YOUR_SITE_ID"
  data-api-url="http://localhost:4000"
  async>
</script>
```

The script:
1. Checks `localStorage` for existing consent — skips banner if already given
2. Fetches banner config from `/api/public/banner/:siteId`
3. Injects styled banner DOM (no external deps, all inline)
4. Handles Accept / Reject / Manage Preferences
5. Posts consent event to `/api/public/consent`
6. Stores anonymous visitor UUID in `localStorage` (key: `cookieguard_visitor_id`)

**Demo page**: `http://localhost:3000/demo.html` — a pre-built page with the embed script. Update `data-site-id` to your site's ID (found in the embed snippet in Banner Builder).

---

## 🔒 Security & Privacy

- **Cookie values not stored** — only metadata (name, domain, flags, expiry)
- **IP addresses hashed** (SHA-256, 16-char truncated) in consent records
- **User agents truncated** to 200 chars
- **All records org-scoped** — org isolation enforced at every query
- **Domain validation** — URLs normalized and validated before scanning
- **SSRF note**: The scanner makes outbound HTTP requests to user-supplied domains. In production, this should run in an isolated network with egress controls, allowlists, and rate limiting. SSRF mitigations (blocking `169.254.x.x`, `10.x.x.x`, `localhost`, etc.) should be added.
