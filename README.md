# Internal Tools POC

A proof-of-concept for replacing Microsoft Power Apps + Dataverse with a
conventional web stack for internal fintech tooling. Three internal tools share
one foundation: session-derived roles, a policy layer enforced inside the
database query, an append-only audit log, and server-driven tables.

This is a prototype for a client pitch. The data is synthetic and the login is a
dropdown, but the *patterns* — where authorisation is enforced, how auditing is
guaranteed, how filtering scales — are real and are the thing being evaluated.

## Running it

Requires Node 20+. No Docker, no database server: the database is a SQLite file
created inside the repo.

```bash
npm install
npm run setup     # applies migrations, generates the client, seeds ~5,300 rows
npm run dev       # http://localhost:3000
```

Sign in as any seeded user from the dropdown. To exercise the different roles,
use "Switch user" in the top-right.

| User             | Role       | Can do                                                        |
| ---------------- | ---------- | ------------------------------------------------------------- |
| Ada Okafor       | admin      | Everything, including flag deletes and the audit log           |
| Mateo Rivera     | ops        | Read/write flags, decide refunds under $500, redacted KYC view |
| Priya Nair       | ops        | (as above)                                                     |
| Hannah Weiss     | compliance | Read-only on flags and refunds, full KYC detail                |
| Jonas Lindqvist  | compliance | (as above)                                                     |

Other commands:

```bash
npm run proof       # asserts role enforcement over HTTP (dev server must be running)
npm run db:reset    # drop, re-migrate and re-seed
npm run lint
npm run typecheck
```

## Proving the enforcement is real

The point of contention with low-code tools is usually *where* a rule is
enforced. Here, no rule lives in the UI. `npm run proof` makes real HTTP requests
as each role and asserts the responses:

```
PASS  anonymous GET /api/feature-flags                   expected 401, got 401
PASS  ops GET /api/audit-logs                            expected 403, got 403
PASS  compliance POST /api/feature-flags                 expected 403, got 403
PASS  ops DELETE /api/feature-flags/:id                  expected 403, got 403
PASS  admin DELETE /api/feature-flags/:id                expected 200, got 200
PASS  audit rows written for the flag                    expected 2, got 2
```

You can reproduce any line by hand with `curl` — bypassing the UI entirely
changes nothing, because the UI was never where the rule lived.

## The shared foundation

### 1. Auth and roles

A signed, http-only cookie holds a user id and nothing else. On every request
the actor is re-read from the database (`src/lib/session.ts`), so the role can
never be forged or go stale in the cookie. This stands in for a
service-principal / IdP-issued identity; swapping the dropdown for OIDC touches
one file.

### 2. Authorisation in the query layer

Every table is reachable only through `src/lib/data/*`. Each function there takes
an `ActorContext` and calls `requirePermission()` before it issues a query, so
there is no code path that reads or writes a row without a role check
(`src/lib/policy.ts`). The model is deny-by-default: roles hold an explicit
permission list, and anything not listed is refused.

This is enforced mechanically, not by convention:

- `src/lib/db.ts` is marked `server-only`, so the Prisma client cannot be pulled
  into a client bundle.
- An ESLint rule forbids importing `@/lib/db` anywhere outside the data layer, so
  a page or API route cannot quietly reach past the policy layer.

Where the rule depends on data rather than only on role, it lives with the data.
Refund decisions are value-gated (`assertCanDecideRefund`), and KYC redaction is
implemented as a narrower Prisma `select` for the `ops` role — the redacted
columns are never read out of the database at all, so there is nothing to leak
in an API response.

### 3. Audit log, guaranteed

One `AuditLog` table records actor, action, entity type, entity id, before/after
JSON snapshots and a timestamp, for all three apps.

Mutations go through `auditedMutate()` (`src/lib/audit.ts`), which writes the
change and its audit row **in the same transaction** — they commit together or
not at all. To stop that being merely a convention, the Prisma client is extended
with a guard that throws `UnauditedMutationError` on any create/update/delete
attempted outside an audited mutation. Forgetting to log is a runtime failure in
development, not a silent gap in the trail.

The admin-only viewer at `/audit` lists changes across all apps and diffs the
before/after snapshots. Entity detail pages show the same trail scoped to one row.

### 4. Server-driven tables

`src/components/data-table.tsx` keeps all filter, sort and pagination state in the
URL, sends it verbatim to an API route, and renders whatever comes back. Filtering,
sorting, counting and pagination all happen in SQL against indexed columns; the
browser never holds more than one page of rows. The exact request URL is shown
under each table so it is visible in a demo.

The refunds table is seeded with 5,200 rows specifically so this is demonstrable
at a volume where a client-side approach would fall over.

### 5. Seed data

`npm run seed` loads a deterministic dataset (fixed PRNG, same data every run):
5 users, 54 feature flags, 5,200 refund requests with a realistic long-tail
amount distribution, and 80 KYC applicants.

## The three apps

The three are built to **deliberately different depths**. Building all three to
the same finish would spend the budget demonstrating the same thing three times;
each one instead answers a different question about whether this stack replaces
Power Apps.

### App 1 — Feature Flag Admin Panel (built fully)

The primary demo, and the reference implementation of the foundation. Full CRUD
with server-side search, environment/state filters and sortable columns. Any role
may read; `ops` and `admin` may create and edit; only `admin` may delete. Every
change is audited.

### App 2 — Refunds Dashboard (built mostly)

*Not yet built — next up.* Demonstrates conditional workflow logic rather than
plain CRUD: server-side filtering over the 5,000+ row dataset, plus an
approve/deny action gated on both role and value (`ops` under $500, `admin` any
amount, `compliance` read-only).

### App 3 — KYC Review Queue (built thin, on purpose)

*Not yet built.* List, detail and status change, with role-gated *visibility*:
`compliance` receives full applicant detail, `ops` receives name and status only,
enforced by the query rather than by hiding fields in the UI.

It exists to show the pattern extends to a higher-stakes domain — nothing more.

#### What app 3 explicitly does NOT solve

Deliberately out of scope, and **not** claimed by this POC:

- Field-level encryption or tokenisation of PII
- Real PII handling, data minimisation or subject-access workflows
- Document upload, storage, virus scanning or secure retrieval
- Retention and deletion policies
- Anything requiring compliance sign-off, or any claim of KYC/AML regulatory
  conformance

The seeded applicant data is synthetic. A real KYC system needs a compliance
review that a prototype cannot substitute for; this app shows only that the same
role, audit and query patterns carry over to that setting.

## Technology choices

- **Next.js (App Router) + TypeScript** — server components for auth-gated pages,
  API routes as the enforcement boundary.
- **SQLite via Prisma** — a real relational database with real indexes and query
  planning, and zero setup for a reviewer. SQLite has no native enum or JSON
  column type, so those fields are `String`, constrained by TypeScript unions and
  validated with Zod at every entry point. Moving to Postgres is a provider change
  in `schema.prisma` plus a fresh migration; nothing in the application layer
  changes.
- **Zod** — every query string and request body is parsed before it reaches a
  query, so filter parameters cannot be injected into Prisma calls.
- **Tailwind** — legibility in a screen recording, not visual design.

## Known limitations

Beyond the app 3 scope note above, and by design for a POC:

- Login is a user dropdown with no credentials.
- No CSRF tokens; the session cookie is `SameSite=Lax`.
- No automated test suite — `npm run proof` covers the authorisation claims that
  matter for the pitch, not general correctness.
- The audit log is append-only by convention; nothing prevents an operator with
  database access from editing it.
