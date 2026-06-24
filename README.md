# SecretScout Pro

Production-grade credential exposure detection platform. Scans GitHub repositories for leaked secrets using regex pattern matching (gitleaks-inspired) with real-time monitoring, live verification, and CI/CD integration.

## Features

- **GitHub Code Search** — Scans public and private repos via GitHub API
- **20 Detection Rules** — AWS, GitHub, Stripe, Slack, database URIs, private keys, generic API keys, JWTs, and more
- **Multi-match Scanning** — Finds every occurrence per rule per file (no missed secrets)
- **Binary File Skipping** — Automatically ignores binaries and files > 1MB
- **Rate Limit Handling** — Reads GitHub rate limit headers, pauses until reset, retries on 403
- **Live Verification** — Pings Stripe, GitHub, Slack, SendGrid, Google APIs to confirm if secrets are active
- **History Scanning** — Scans git commit diffs for deleted/rotated secrets
- **CI/CD Integration** — GitHub Action that fails pipeline on critical/high findings
- **Report Export** — HTML, CSV, and JSON reports with severity breakdown and findings table
- **Real-time Feed** — WebSocket-powered live findings stream
- **Token Pool Rotation** — Round-robin GitHub PAT rotation to avoid rate limits
- **Scope Restriction** — Hardcoded allowlist-only scanning by default
- **Dashboard** — Severity breakdown, findings trend, MTTR metrics, category analysis
- **Integrations** — Webhook, Slack, PagerDuty alert routing

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (runtime)
- [Node.js](https://nodejs.org/) 18+
- A GitHub Personal Access Token with `repo` scope

### Setup

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env  # or edit .env directly

# Initialize database
bunx prisma generate
bunx prisma db push

# Seed builtin rules and templates
bun run db:seed

# Start development server
bun run dev
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite database path (default: `file:./db/dev.db`) |
| `SECRETSCOUT_API_KEY` | No | API key for protecting endpoints. If unset, all endpoints are open. |

### First Scan

1. Open http://localhost:3000
2. Go to **Settings**
3. Click **Add Scope** — add a GitHub org or user (e.g. `octocat`)
4. Click **Add Token** — enter a GitHub PAT (`ghp_...`)
5. Go to **Discovery** — click **Start Scan**
6. Watch findings appear in **Live Feed**

## New Features

### Secret Verification

After a finding is discovered, click **Verify** to ping the provider's API and confirm if the secret is currently live. Supports:

- **AWS** — calls `sts.getCallerIdentity`
- **Stripe** — calls `/v1/balance`
- **GitHub** — calls `/user`
- **Slack** — calls `auth.test`
- **SendGrid** — calls `/v3/user/profile`
- **Google** — calls Discovery API

### History Scanning

Scan git commit diffs to find secrets that were deleted or rotated. Navigate to **Discovery → History Scan**, enter a repo name, and click **Scan History**. Paginated with rate limit handling.

### CI/CD Integration

Add the GitHub Action to your workflow:

```yaml
- name: SecretScout Scan
  uses: ./.github/actions/secretscout-scan
  with:
    secretscout-url: ${{ secrets.SECRETSCOUT_URL }}
    api-key: ${{ secrets.SECRETSCOUT_API_KEY }}
    scan-mode: current
    fail-on-finding: 'true'
```

### Report Export

Click **Export Report** on the Dashboard to download an HTML report. Or call the API directly:

```
GET /api/report?format=html   # HTML report
GET /api/report?format=csv    # CSV export
GET /api/report?format=json   # JSON dump
```

## Architecture

```
Next.js App (port 3000)
├── API Routes (18 endpoints)
│   ├── /api/dashboard        — Stats and charts
│   ├── /api/findings         — Finding list
│   ├── /api/scan/trigger     — Start background scan
│   ├── /api/scan/history     — Historical commit scanning
│   ├── /api/finding/verify   — Live secret verification
│   ├── /api/report           — HTML/CSV/JSON report export
│   ├── /api/tokens           — CRUD for GitHub PATs
│   ├── /api/scope            — CRUD for scope entries
│   └── /api/integrations     — CRUD for webhooks
├── Scan Engine
│   ├── GitHub Code Search API
│   ├── Regex pattern matching (20 rules, matchAll)
│   ├── Binary/oversize file detection
│   ├── Rate limit sleep + retry
│   ├── Deduplication (SHA-based)
│   └── Token pool rotation
├── Verification Engine
│   ├── AWS, Stripe, GitHub, Slack, SendGrid, Google
│   └── Read-only, single-attempt, 10s timeout
├── History Scanner
│   ├── Git diff parsing
│   └── Deleted secret detection
└── WebSocket Feed (port 3004)
    └── Real-time finding notifications
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Runtime | Bun |
| UI | shadcn/ui + Tailwind CSS |
| State | Zustand + React Query |
| Database | SQLite (Prisma ORM) |
| Real-time | Socket.IO |
| Charts | Recharts |

## API Authentication

If `SECRETSCOUT_API_KEY` is set, all API requests must include:

```
Authorization: Bearer <your-api-key>
```

The frontend stores the key in localStorage and sends it automatically.

## License

Private — All rights reserved.
