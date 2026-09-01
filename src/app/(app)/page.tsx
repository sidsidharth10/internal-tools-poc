import Link from "next/link";

import { Badge, Card, PageHeader } from "@/components/ui";
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
    depth: "Built thin (deliberately)",
    description:
      "List, detail and status change. Demonstrates row-level redaction: ops receive fewer columns from the database than compliance.",
  },
] as const;

export default async function HomePage() {
  const actor = await requireActor();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Signed in as ${actor.name}`}
        description="Three internal tools sharing one foundation: session-derived roles, a policy layer enforced in the query, an append-only audit log, and server-driven tables."
        actions={<Badge tone="blue">{ROLE_LABELS[actor.role]}</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {APPS.map((app) => (
          <Link key={app.href} href={app.href}>
            <Card className="h-full p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{app.title}</h2>
                <Badge>{app.depth}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">{app.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="font-semibold text-slate-900">
          Your effective permissions
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Resolved from the database on every request and checked inside each
          data-access function, before any query runs.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ROLE_PERMISSIONS[actor.role].map((permission) => (
            <Badge key={permission} tone="green">
              {permission}
            </Badge>
          ))}
        </div>
        {!can(actor, "audit.read") ? (
          <p className="mt-3 text-sm text-slate-500">
            The audit log is admin-only, so it is not in the navigation for this
            role — and requesting <code>/api/audit-logs</code> directly returns
            403.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
