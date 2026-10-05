# TraceIQ

Multi-tenant audit logging and security detection SaaS. Services send audit events
over an API; TraceIQ stores them, detects suspicious patterns in real time, alerts via
webhooks, and lets an AI agent investigate a user's activity.

```
Service ──POST /api/v1/events──▶ API (202) ──▶ BullMQ queue ──▶ Worker
                                                              ├─ Gemini embedding
                                                              ├─ PostgreSQL
                                                              ├─ Detection rules (Redis)
                                                              └─ Webhook on detection
```

## Features

- **Ingestion** — API-key authenticated, validated, processed asynchronously through a queue
- **Detection engine** — brute-force logins (Redis sliding window), bulk data export, after-hours admin activity
- **Alerts** — Open → Acknowledged → Resolved workflow, webhooks
- **Audit log** — filters, time ranges, cursor pagination, CSV export
- **Actor profiles** — per-user timeline, services and top actions
- **AI investigation** — LangGraph two-agent graph (tool-using investigator + structured reporter) with semantic search over event embeddings
- **Multi-tenancy & RBAC** — tenant isolation on every query, 5 roles, JWT with rotating refresh cookie

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js, TypeScript, Express, Prisma, PostgreSQL |
| Async | BullMQ, Redis (queue, detection state, cache) |
| AI | LangGraph + LangChain, Google Gemini |
| Frontend | React 19, Vite, Tailwind CSS v4, TanStack Query |

## Repository layout

| Path | Contents |
|---|---|
| [`traceIQ-backend/`](traceIQ-backend/) | API, worker, detection engine, AI module — [full backend docs](traceIQ-backend/README.md) |
| [`traceIQ-frontend/`](traceIQ-frontend/) | React dashboard |
| [`docker-compose.yml`](docker-compose.yml) | Postgres, Redis, API, worker and frontend in containers |
| [`DEMO.md`](DEMO.md) | How to run it, demo walkthrough, design Q&A |

## Quick start

Requires Node.js, PostgreSQL and Redis running locally.

```bash
cd traceIQ-backend
cp .env.example .env            # fill in DATABASE_URL, REDIS_URL, token secrets, GOOGLE_API_KEY
npm install && npx prisma migrate deploy && npm run db:seed:reset
npm run dev                     # API on :3000 — run `npm run worker` in a second terminal
```

```bash
cd traceIQ-frontend
npm install && npm run dev      # UI on http://localhost:5173 — use "Try Demo Account"
```

See [DEMO.md](DEMO.md) for the full walkthrough.
