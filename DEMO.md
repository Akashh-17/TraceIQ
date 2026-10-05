# TraceIQ — Demo & Interview Guide

## What TraceIQ is

A multi-tenant audit-logging SaaS. Companies send it events from their own systems
("bob logged in", "alice exported 1,500 records"). TraceIQ stores them, detects
suspicious patterns, alerts via webhook, and lets an AI agent investigate a user.

**How an event flows:**

```
Customer service ──POST /api/v1/events──▶ API (validates, returns 202 immediately)
                                            │
                                            ▼
                                     BullMQ queue (Redis)
                                            │
                                            ▼
                                     Worker process
                                       1. turn event into a sentence + Gemini embedding
                                       2. save to PostgreSQL
                                       3. run detection rules (Redis)
                                       4. on match → save detection → fire webhook
                                       5. invalidate dashboard cache
```

## What's implemented

| Area | Feature |
|---|---|
| Ingestion | API-key authenticated `POST /api/v1/events`, async via queue, Zod validation |
| Detection | 3 rules: 5+ failed logins in 10 min (HIGH), export > 1,000 records (MEDIUM), admin activity outside 08:00–18:59 (LOW) |
| Alerts | Detection status workflow (Open → Acknowledged → Resolved), webhooks with a test button |
| Audit log | Filters (actor, action, 24h/7d/30d), cursor pagination, event detail drawer with related events, CSV export |
| Dashboard | KPIs, events per hour, top actions, detection trend, top actors, live activity feed |
| Actors | Profile page: stats, services used, top actions, paginated activity timeline |
| AI | LangGraph two-agent investigation (investigator with tools → reporter with structured output), semantic search over embeddings, investigation history |
| Accounts | Self-serve signup (creates a workspace + API key), login, onboarding wizard, password change |
| Security | 5 roles (SUPER_ADMIN, TENANT_ADMIN, AUDITOR, ANALYST, VIEWER), hashed API keys, JWT + rotating refresh cookie, login rate limiting |
| Developer | Integration guide page with cURL / Node.js / Python examples and live API key |

## Starting the app

Postgres and Redis run locally as Windows services. Open three terminals:

```bash
cd traceIQ-backend && npm run dev       # API on http://localhost:3000
```
```bash
cd traceIQ-backend && npm run worker    # background processor
```
```bash
cd traceIQ-frontend && npm run dev      # UI on http://localhost:5173
```

**Before every rehearsal and before the real demo**, reset the demo data:

```bash
cd traceIQ-backend && npm run db:seed:reset
```

This loads 149 events over 30 days and 3 detections, and clears Redis
cooldown keys. Without it, re-sending the same live demo within 15 minutes
won't fire a new detection (that cooldown is deliberate, to stop alert spam).

`traceIQ-backend/.env` needs `GOOGLE_API_KEY` (free from https://aistudio.google.com)
for AI investigation and semantic search. Everything else works without it.

## Accounts

| Login | Password | Use for |
|---|---|---|
| `admin@finstack.com` | `password123` | The demo (the "Try Demo Account" button fills this in) |
| `viewer@finstack.com` | `password123` | Showing role-based access (no Users page, no API key) |
| `auditor@`, `analyst@finstack.com`, `superadmin@traceiq.io` | `password123` | Other roles |

Demo tenant API key for sending events: `tk_live_finstack_999`

**Sign up** ("Create a workspace" on the login page) creates a brand-new empty
company and shows its API key once. Show it briefly as "self-serve onboarding",
then switch to the demo account, which has data.

## The 7-minute demo

1. **Login → Dashboard** (1 min). "Each company only sees its own data. This is
   30 days of activity for a fintech customer."
2. **Audit Log** (1 min). Switch 24h / 7d, filter by actor, click a row to show the
   detail drawer and related events, then **Export CSV**.
3. **Detections** (1 min). Three seeded alerts. Click **Acknowledge** to show the workflow.
4. **Live detection** (1.5 min). Run this in PowerShell, then refresh Detections:

   ```powershell
   1..5 | ForEach-Object { Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/events -Headers @{ Authorization = "Bearer tk_live_finstack_999" } -ContentType "application/json" -Body (@{ actor = "mallory@finstack.com"; action = "LOGIN_FAILED"; source_service = "AUTH_SERVICE"; resource_type = "session"; resource_id = "sess_$_" } | ConvertTo-Json) }
   ```

   A new HIGH alert for mallory appears within a few seconds. Narrate the flow
   above: 202 → queue → worker → Redis sliding window → detection → webhook.

   Optional bulk-export alert:

   ```powershell
   Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/events -Headers @{ Authorization = "Bearer tk_live_finstack_999" } -ContentType "application/json" -Body (@{ actor = "eve@finstack.com"; action = "DATA_EXPORTED"; source_service = "REPORTING_SERVICE"; resource_type = "report"; resource_id = "rpt_live"; metadata = @{ recordsCount = 2000 } } | ConvertTo-Json)
   ```

5. **Actor profile** (1 min). Click `bob.smith@finstack.com`: timeline, services, top actions.
6. **AI Investigate** (1.5 min). On Detections, open AI Investigate for bob and ask
   *"Why did this actor trigger a MULTIPLE_FAILED_LOGINS detection?"* It takes about
   10 seconds. While it runs, explain: the investigator agent calls tools
   (detections, event search, semantic search, timeline), then a reporter agent
   writes a structured report. It should cite the real IP (203.0.113.45) and times.
7. **Integration page** (30 s). "This is how a customer connects their services."

Optional extras: log in as `viewer@finstack.com` to show restricted access;
add a webhook URL in Settings and click **Test →**.

## If something goes wrong

| Symptom | Cause / fix |
|---|---|
| Live failed-login demo creates no new alert | Cooldown from a rehearsal. Use a new actor name, or run `npm run db:seed:reset` |
| AI says "rate limit reached" | Free tier allows a few requests per minute. Wait 60 seconds. Run at most one investigation per minute |
| AI says "not configured" | `GOOGLE_API_KEY` missing in `traceIQ-backend/.env`. Restart API and worker after adding it |
| Events accepted (202) but never appear | The worker isn't running |
| `EADDRINUSE` on port 3000 | An old API process is still running. Close it or restart the terminal |
| An extra LOW "after hours" alert appears | Events sent as an admin user before 08:00 or after 18:59 trigger that rule. Use non-admin actor names |

## Explaining the design (likely interview questions)

**Why a queue instead of writing to the database directly?**
Ingestion only validates and enqueues, so it returns `202 Accepted` in milliseconds even
under bursts. The slow work (embeddings, detection, DB writes) happens in the worker,
with up to 3 attempts and exponential backoff, so a temporary failure doesn't lose events.

**Why a separate worker process?**
Failure isolation and independent scaling: if the worker crashes, the API keeps accepting
events into the queue; you can run more workers without touching the API.

**How does brute-force detection work?**
Per tenant and actor, a Redis sorted set stores failed-login event IDs scored by time.
Each new failure adds itself, removes entries older than 10 minutes, and counts what's
left. At 5 or more, a detection is saved. A 15-minute debounce key prevents duplicates.

**How is tenant data isolated?**
The tenant ID always comes from the authenticated API key or JWT, never from the request
body, and every query filters by it. Looking up another tenant's event returns 404, not
403, so you can't even learn it exists. AI tools are created per investigation, bound to
one tenant.

**How does authentication work?**
Machines use API keys, stored only as SHA-256 hashes and shown once. People log in for a
short-lived JWT kept in memory, plus a refresh token in an HttpOnly, SameSite=strict
cookie that is rotated on every use.

**Why cursor pagination?**
Offset pagination gets slower the deeper you page because the database must skip rows.
A cursor (the last-seen ID) jumps straight to the right place using the index.

**How does the AI investigation work?**
A LangGraph graph with two agents. The investigator has four tenant-scoped tools and
loops (capped at 3 turns) until it has evidence; the reporter turns that evidence into
a Zod-validated JSON report. Semantic search uses embeddings created when each event is
stored, compared by cosine similarity.

**What would you improve next?**
Be honest. Good answers:
- Detection rules use the processing time, not the event's own timestamp, so replayed
  or delayed events are judged by when they arrive.
- Semantic search compares against the latest 500 events in application code; at scale
  that should move into the database with pgvector.
- Automated tests for the detection rules and tenant isolation.
- Detection rules defined as configuration instead of code.

## Real bugs found and fixed (good "hardest bug" stories)

1. **Live detections never fired.** The worker passed BullMQ's connection *options*
   into the detection engine instead of a Redis client, hidden by an `as any` cast.
   Every rule threw, and errors were logged as `{}` because the logger only serialises
   errors under the `err` key. Fixed by passing the real client and logging properly.
2. **The AI agent forgot the question.** The investigator node built its prompt but only
   saved the model's reply into graph state, so from the second loop the model saw tool
   calls with no question. OpenAI tolerated it; Gemini rejected it, which exposed the bug.
3. **Refreshing the page logged you out.** Two refresh requests ran at once; refresh
   tokens are single-use, so the second one failed and triggered logout. Fixed with one
   shared in-flight refresh request.
4. **The events-per-hour chart was always empty.** Raw SQL used snake_case column names,
   but the actual columns are camelCase.
