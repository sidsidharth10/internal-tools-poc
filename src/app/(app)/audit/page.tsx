import { Suspense } from "react";

import { Card, PageHeader } from "@/components/ui";
import { can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

import { AuditTable } from "./audit-table";

export default async function AuditPage() {
  const actor = await requireActor();

  if (!can(actor, "audit.read")) {
    return (
      <Card className="p-5 text-sm text-ink-soft">
        You don&apos;t have access to the audit log.
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every change made across the tools, with who made it and what it replaced."
      />
      <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
        <AuditTable />
      </Suspense>
    </div>
  );
}
