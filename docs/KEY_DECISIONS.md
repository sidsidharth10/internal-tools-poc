# Key Decisions One-Pager

## Goals

Four concerns matter for a regulated fintech with 10+ apps planned:

- **Server-side authorization.** The API must reject unauthorized requests. Hiding a UI button is not enough.
- **Data volume.** Power Apps can fail silently on non-delegable queries above 500 rows, with a configurable limit of 2,000. KYC queues and refunds tables will quickly exceed that.
- **Auditability.** Every mutation should create an audit record. A write without one should be impossible.
- **Marginal cost of the next app.** With 10+ more apps planned, the key question is whether a shared foundation makes apps 2 and 3 cheaper than app 1.

## Pre-Build Scoping

Power Apps can build CRUD screens quickly, so a CRUD demo alone does not tell a VP much.

**Dataverse RBAC may carry over.** If the existing apps use Dataverse, a custom frontend can authenticate through Dataverse's Web API using a service principal and inherit the existing security roles, row-level permissions, and audit trail. That would leave the main build effort focused on replacing the license-gated builder layer while keeping the governance layer.

We did not have a Dataverse tenant to test this against, so the POC simulates the same model: server-side role resolution enforced at the query layer. If this moves forward, testing against a live tenant should be the first step.

## What We Built

One shared foundation for three tools, built to different depths.

**Feature flags — full build.** Full CRUD with role-based access: everyone can view, ops and admin can edit, and only admin can delete. Every change is written to the audit log. We built this end to end because it is the simplest case and should represent most of the other 10+ apps.

**Refunds — mostly built.** 5,200 seeded rows with server-side filtering, sorting, and pagination. Approval logic is also server-side: ops can approve refunds under $500, admin can approve any amount, and compliance can view but not approve. We mocked the transaction source rather than integrating with a live payment processor. The integration would have taken days without proving anything new about the core pattern.

**KYC review — thin build.** A role-gated review queue. For an ops user, restricted fields are never selected from the database, so they are not present in the API response rather than simply hidden in the UI.

We stopped there intentionally. A real KYC tool also needs field-level encryption, document storage, retention and deletion policies, and compliance review. Those cannot be credibly built in an afternoon without a compliance stakeholder. The thin build shows that the access-control pattern extends to sensitive data without pretending the hard parts of KYC are solved. That is where the build-vs-buy decision actually matters.

## Architecture Decisions (made with Devin)

**Prisma as the ORM.** All queries go through Prisma rather than raw SQL. This gives us type-safe queries, a single schema definition, and version-controlled migrations. It also gives us one place to enforce the audit guard and data-access layer. The tradeoff is another dependency and the SQLite limitations below.

**One data-access layer, enforced by lint rule.** All database access lives in `src/lib/data/`. An ESLint rule makes Prisma imports outside that directory a build error.

The alternative is to put permission checks in individual routes. That works until someone adds a route and forgets a check, creating a data leak. One enforced data-access layer makes that harder to do.

**Audit and mutation use the same transaction.** Every write and its audit record commit together through `auditedMutate()`. The Prisma client throws if a write is attempted without an audit record. This makes it impossible to change data without an audit trail, including by accident. Seed scripts and bulk operations therefore have to bypass this deliberately.

**SQLite instead of Postgres.** Postgres requires Docker locally, which adds friction when someone else needs to run the demo. At the row counts we are testing, SQLite supports the same real SQL, indexes, and server-side filtering.

The tradeoffs are no native enums, so statuses are strings validated in TypeScript and Zod, and no case-insensitive collation setting, which is not relevant here because SQLite's `LIKE` is already case-insensitive for ASCII. Moving to Postgres later requires a config change and fresh migration, not a rewrite.

**URL query params for table state.** Filters and sorting live in the URL (`?status=&min=&sort=&page=`) and are passed to an API route that builds the SQL query. This adds some plumbing, but filtered views are shareable, browser back/forward works, and the network tab shows that filtering happens on the server rather than in the client.

**Passwordless dropdown login.** Login is a dropdown of seeded users with no password. Real SSO would be a standard integration but would add roughly a day without proving anything about whether Devin can replace Power Apps.

The important part is that the server reads the user's role from the database on every request and never trusts role information from the client. That works the same way with a real OIDC login.

## Honest Weaknesses

- **5,200 rows is not a load test.** It shows that filtering happens server-side and returns the right results. To claim we have cleared the Power Apps ceiling, we should test 100K+ rows and measure query times under load.
- **Authorization is not in CI.** The proof script makes real HTTP calls as each role and checks the expected refusals, but it is not wired into CI. A future policy change could therefore introduce a regression without being caught automatically.
- **Authorization is simplified.** There is one role per user, with no delegation, approval chains, or per-record ownership. Production fintech authorization is usually more complex.

## Recommendation

**Build, but keep the scope narrow.**

The pattern works for new, lower-risk internal tools, and the shared foundation behaves as intended. I would not extend it to KYC or other regulated-data apps until:

1. The current Dataverse/backend setup is confirmed against a live tenant.
2. The authorization pattern is validated in that environment.
3. Compliance reviews the approach for regulated data.

The strongest case is not "we can rebuild a Power App." It is that the next 10 apps can share the same backend, authorization, audit, and data-access foundation instead of rebuilding those pieces each time.
