import Link from "next/link";

import { Badge, Card, CardHeader, Mono, PageHeader } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/domain";
import { ROLE_PERMISSIONS, can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

const APPS = [
  {
    href: "/flags",
    title: "Feature Flags",
    depth: "Built fully",
    description:
      "Full CRUD with server-side search, filter and sort. Any role can read; ops and admin can write; only admin can delete.",
  },
  {
    href: "/refunds",
    title: "Refunds Dashboard",
    depth: "Built mostly",
    description:
      "5,000+ rows with server-side filtering, plus a value-gated approval workflow: ops decide under $500, admin any amount, compliance read-only.",
  },
  {
    href: "/kyc",
    title: "KYC Review Queue",
    depth: "Built thin",
    description:
      "List, detail and status change. Demonstrates row-level redaction: ops receive fewer columns from the database than compliance.",
  },
] as const;

const FOUNDATION = [
  {
    title: "Session-derived identity",
    body: "The cookie carries a user id only. The role is re-read from the database on every request, so it cannot be forged client-side.",
  },
  {
    title: "Policy in the query layer",
    body: "Each data-access function takes the actor and checks a permission before it builds a query. Nothing outside that layer can reach Prisma.",
  },
  {
    title: "Audit as an invariant",
    body: "Mutations run through an audited path that writes the before/after snapshot in the same transaction — an unaudited write throws.",
  },
] as const;

export default async function HomePage() {
  const actor = await requireActor();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome, ${actor.name.split(" ")[0]}`}
        description="Three internal tools sharing one foundation: session-derived roles, a policy layer enforced in the query, an append-only audit log, and server-driven tables."
        actions={<Badge tone="blue" dot>{ROLE_LABELS[actor.role]}</Badge>}
      />

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
          Applications
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {APPS.map((app) => (
            <Link
              key={app.href}
              href={app.href}
              className="group rounded-card focus-visible:outline-none"
            >
              <Card className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-brand-200 group-hover:shadow-raised">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-ink">
                    {app.title}
                  </h3>
                  <Badge>{app.depth}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {app.description}
                </p>
                <p className="mt-4 text-xs font-medium text-brand-600">
                  Open
                  <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader
            title="How the foundation holds"
            description="The same three mechanisms back every app; nothing below is app-specific."
          />
          <dl className="divide-y divide-line">
            {FOUNDATION.map((item) => (
              <div key={item.title} className="px-5 py-4">
                <dt className="text-sm font-medium text-ink">{item.title}</dt>
                <dd className="mt-1 text-sm leading-6 text-ink-soft">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="h-fit">
          <CardHeader
            title="Your effective permissions"
            description={`Resolved for ${ROLE_LABELS[actor.role]} before any query runs.`}
          />
          <div className="px-5 py-4">
            <div className="flex flex-wrap gap-1.5">
              {ROLE_PERMISSIONS[actor.role].map((permission) => (
                <Badge key={permission} tone="green">
                  {permission}
                </Badge>
              ))}
            </div>
            {!can(actor, "audit.read") ? (
              <p className="mt-4 text-sm leading-6 text-ink-muted">
                The audit log is admin-only, so it is absent from the
                navigation for this role — and requesting{" "}
                <Mono>/api/audit-logs</Mono> directly returns 403.
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
