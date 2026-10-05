<h1 align="center">
  <br/>
  🔍 TraceIQ
  <br/>
</h1>

<p align="center">
  <strong>An enterprise-grade, AI-augmented Audit Log &amp; Security Intelligence platform</strong>
  <br/>
  Built for multi-tenant SaaS products that need reliable event tracing, real-time threat detection, and intelligent investigation.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-7.x-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white"/>
  <img src="https://img.shields.io/badge/Prisma-7.x-2D3748?style=flat-square&logo=prisma&logoColor=white"/>
  <img src="https://img.shields.io/badge/BullMQ-5.x-FF6B6B?style=flat-square"/>
  <img src="https://img.shields.io/badge/LangGraph-1.x-00A67E?style=flat-square&logo=langchain&logoColor=white"/>
  <img src="https://img.shields.io/badge/Google-Gemini-4285F4?style=flat-square&logo=googlegemini&logoColor=white"/>
</p>

---

## What is TraceIQ?

TraceIQ is a backend-first platform that gives SaaS products a **production-ready audit log infrastructure** — the kind that usually takes months to build correctly. It accepts event streams from any service via a simple REST API, persists them durably, and layers three powerful capabilities on top:

1. **Deterministic Detection Engine** — rule-based, Redis-backed threat detection that fires on every ingested event in the background.
2. **Semantic Search (Operational RAG)** — every event is embedded at write-time using Gemini; investigators can search by natural language concept, not just exact filters.
3. **AI Investigation Agent** — a LangGraph-powered agentic loop that autonomously gathers evidence, runs tools, and produces a structured security report on demand.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       Client / Source Services                   │
│                  (POST /api/v1/events  + API Key)                │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Express API Server                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Auth (JWT)  │  │ Rate Limiter │  │  Helmet / CORS / Zod   │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
│                         │                                        │
│                  Events accepted → 202                           │
└───────────────────────────┬──────────────────────────────────────┘
                            │ Enqueue Job
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Redis (BullMQ Queue)                         │
│              Durable job storage + retry backoff                 │
└───────────────────────────┬──────────────────────────────────────┘
                            │ Dequeue Job
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Background Worker Process                     │
│                                                                  │
│  1. Generate NL representation + Gemini Embedding               │
│  2. Persist to PostgreSQL (via Prisma)                          │
│  3. Run Detection Engine (rule evaluation against Redis state)  │
│  4. Invalidate Redis Cache for this tenant                      │
└───────────────┬──────────────────────┬───────────────────────────┘
                │                      │
                ▼                      ▼
        PostgreSQL (Primary)      Redis (State + Cache)
```

The API and Worker run as **separate processes**. If one crashes, the other keeps running. No event is lost.

---

## Key Features

### 🔐 Multi-Tenant with RBAC

Every entity in the system is scoped to a `Tenant`. API key authentication (`Authorization: Bearer <key>`) isolates event streams at the data layer. A five-tier role system (`SUPER_ADMIN → VIEWER`) governs dashboard access via JWT + refresh token rotation with per-device session tracking.

### ⚡ Async Write Pipeline (BullMQ)

Ingest endpoints return `202 Accepted` immediately. The actual database write happens in a dedicated worker process with automatic retry (3 attempts, exponential backoff). The queue acts as a durable buffer — spikes in event volume never result in dropped data.

### 🔎 Deterministic Detection Engine

Every event passing through the worker is evaluated against a pluggable rule set. Rules are isolated functions with a shared Redis context, enabling both **stateless** (single-event) and **stateful** (windowed, multi-event) detection patterns. Debounce keys in Redis prevent alert storms.

**Built-in Rules:**
| Rule | Type | Severity |
|---|---|---|
| `MULTIPLE_FAILED_LOGINS` | Stateful — 5 failures / 10 min window | 🔴 HIGH |
| `BULK_DATA_EXPORT` | Stateless — >1000 records exported | 🟡 MEDIUM |
| `AFTER_HOURS_ADMIN_ACTIVITY` | Stateless — admin action outside 08:00–18:00 | 🔵 LOW |

### 🧠 AI Investigation Agent (LangGraph)

A multi-node agentic graph (`investigator → tools ⇄ tools → reporter`) that autonomously investigates a subject. The investigator node decides which tools to call; the reporter node synthesizes all gathered evidence into a structured report. The agent has four tools at its disposal:

| Tool              | Purpose                                                           |
| ----------------- | ----------------------------------------------------------------- |
| `get_detections`  | Pull all backend-triggered alerts for an actor                    |
| `exact_search`    | Structured Prisma query by actor / action                         |
| `semantic_search` | Cosine similarity over stored Gemini embeddings (Operational RAG) |
| `get_timeline`    | Chronological event history for an actor                          |

### 🗃️ Operational RAG (Semantic Search)

At write-time, the worker converts each event into a natural language sentence and generates a Gemini embedding. At query-time, the AI agent (or the API directly) can search by concept — _"unauthorized access"_, _"large financial transfer"_ — rather than exact field values.

### 📊 Dashboard APIs with Redis Cache

Aggregation endpoints (`total events`, `events today`, `top actors`, `top actions`, `failed logins`) are backed by a **Cache-Aside** layer (60 s TTL). The worker automatically invalidates a tenant's cache after every successful write, keeping the dashboard near-real-time without costly `COUNT` queries on every request.

### 📄 Cursor Pagination

All list endpoints use cursor-based pagination (the `limit + 1` trick). No `COUNT(*)` queries. No offset scans. Consistent performance at any table size.

---

## Tech Stack

| Layer             | Technology                                         |
| ----------------- | -------------------------------------------------- |
| **Runtime**       | Node.js, TypeScript 7                              |
| **Framework**     | Express 5                                          |
| **Database**      | PostgreSQL 16 via Prisma 7                         |
| **Queue / Cache** | Redis 7 via BullMQ 5 + ioredis                     |
| **AI / LLM**      | Google Gemini via LangChain + LangGraph            |
| **Auth**          | JWT (access) + bcrypt-hashed refresh tokens        |
| **Validation**    | Zod 4                                              |
| **Logging**       | Pino (structured JSON)                             |
| **Security**      | Helmet, CORS, express-rate-limit                   |
| **Load Testing**  | k6 (smoke / load / stress / spike / p99 scenarios) |

---

## Project Structure

```
src/
├── app.ts                   # Express wiring — middleware, routes, error handlers
├── config/                  # env, prisma, redis, queue, logger
├── routes/                  # Route declarations (thin layer)
├── controllers/             # HTTP in/out — no business logic
├── services/                # Business logic (events, query, auth, cache)
├── models/                  # Repository pattern — all Prisma calls live here
├── middlewares/             # Auth, error handler, rate limiter
├── modules/
│   ├── ai/                  # LangGraph agent, nodes, tools, embedding service
│   └── detection/           # Detection engine, rule definitions, types
├── workers/                 # BullMQ worker process (separate from API)
├── jobs/                    # Queue producers
├── types/                   # Shared TypeScript types / DTOs
└── utils/                   # AppError, response helpers
```

---

## Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL 16
- Redis 7
- A free Google Gemini API key from [Google AI Studio](https://aistudio.google.com) (optional — enables AI features)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, GOOGLE_API_KEY
```

### 3. Initialise the database

```bash
npm run db:migrate   # Run all Prisma migrations
npm run db:seed      # Seed tenant + demo data
```

### 4. Run the API server

```bash
npm run dev
```

### 5. Run the Background Worker (separate terminal)

```bash
npm run worker
```

### 6. (Optional) Monitor the queue

```bash
npm run monitor
```

---

## API Reference

| Method | Endpoint                 | Description                                   |
| ------ | ------------------------ | --------------------------------------------- |
| `GET`  | `/health`                | Health check                                  |
| `POST` | `/api/v1/events`         | Ingest an audit event (API key auth)          |
| `GET`  | `/api/v1/events`         | Query events with filters + cursor pagination |
| `GET`  | `/api/v1/events/:id`     | Get a single event by ID                      |
| `GET`  | `/api/v1/dashboard`      | Dashboard aggregation stats                   |
| `POST` | `/api/v1/auth/register`  | Register a tenant user                        |
| `POST` | `/api/v1/auth/login`     | Login — returns access + refresh tokens       |
| `POST` | `/api/v1/auth/refresh`   | Rotate refresh token                          |
| `POST` | `/api/v1/auth/logout`    | Revoke session                                |
| `GET`  | `/api/v1/actors`         | List all actors for a tenant                  |
| `GET`  | `/api/v1/detections`     | List all triggered detections                 |
| `POST` | `/api/v1/ai/investigate` | Run the AI investigation agent                |
| `GET`  | `/api/v1/users`          | List tenant users (RBAC-protected)            |
| `POST` | `/api/v1/api-keys`       | Manage tenant API keys                        |

A full Postman collection is included at the project root: `traceIQ-postman-collection.json`.

---

## Load Testing

```bash
npm run benchmark:smoke    # Quick sanity check
npm run benchmark:load     # Sustained realistic load
npm run benchmark:stress   # Push until breaking point
npm run benchmark:spike    # Sudden traffic surge
npm run benchmark:p99      # p99 latency profiling
```

---

## Design Decisions

**Why BullMQ over direct DB writes?**
Decoupling the ingest path from the persistence path means the API is never bottlenecked by database write latency. The queue absorbs spikes, and the worker processes at a stable rate. If the worker crashes, jobs stay in Redis until it recovers — not a single event is lost.

**Why cursor pagination over offset?**
`OFFSET N` forces the database to scan and discard N rows on every request. With millions of audit events, this degrades to O(N) scans. Cursor pagination uses a B-tree index seek — O(log N) regardless of depth.

**Why Operational RAG instead of a vector DB?**
For event volumes that fit comfortably in a single PostgreSQL instance, a vector store is unnecessary overhead. Embeddings are stored as `Float[]` columns alongside the events. The semantic search tool fetches recent candidates and performs cosine similarity in Node.js — zero additional infrastructure, near-zero latency overhead.

**Why LangGraph for the AI agent?**
LangGraph's `StateGraph` makes the agentic loop explicit, inspectable, and deterministic in structure. The `investigator ⇄ tools` cycle continues until the LLM stops issuing tool calls, then the `reporter` node takes over. The graph is statically defined — no dynamic prompt-chaining surprises.

---

## Security

- All API responses strip `embedding` vectors before returning to clients.
- Tenant isolation is enforced at the **database layer** — every query includes `tenantId` in the `WHERE` clause.
- Refresh tokens are stored **hashed** (bcrypt) — the plain token never touches the database.
- Secrets are validated at startup via a typed env parser — the server refuses to boot with a missing or malformed `.env`.

---

<p align="center">Built as a mini-project to explore real-world backend architecture — async pipelines, multi-tenancy, AI agents, and security engineering — from first principles.</p>
