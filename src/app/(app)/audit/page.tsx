import { Suspense } from "react";

import { Card, Mono, PageHeader } from "@/components/ui";
import { can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

import { AuditTable } from "./audit-table";

export default async function AuditPage() {
  const actor = await requireActor();

  if (!can(actor, "audit.read")) {
    return (
      <Card className="p-5 text-sm text-ink-soft">
        The audit log is restricted to the admin role. Your role is{" "}
        <Mono>{actor.role}</Mono>.
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Shared foundation"
        title="Audit Log"
        description="Every mutation across all three apps, written in the same transaction as the change itself. Admin only."
      />
      <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
        <AuditTable />
      </Suspense>
    </div>
  );
}
