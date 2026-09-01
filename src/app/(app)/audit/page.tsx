import { Suspense } from "react";

import { Card, PageHeader } from "@/components/ui";
import { can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

import { AuditTable } from "./audit-table";

export default async function AuditPage() {
  const actor = await requireActor();

  if (!can(actor, "audit.read")) {
    return (
      <Card className="p-4 text-sm text-slate-700">
        The audit log is restricted to the admin role. Your role is{" "}
        <span className="font-mono">{actor.role}</span>.
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every mutation across all three apps, written in the same transaction as the change itself. Admin only."
      />
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <AuditTable />
      </Suspense>
    </div>
  );
}
