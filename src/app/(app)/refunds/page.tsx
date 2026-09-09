import { Suspense } from "react";

import { Callout, PageHeader } from "@/components/ui";
import { OPS_REFUND_LIMIT_CENTS, formatCents } from "@/lib/domain";
import { can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

import { RefundsTable } from "./refunds-table";

export default async function RefundsPage() {
  const actor = await requireActor();
  const canDecideAny = can(actor, "refunds.decide.any");
  const canDecideLimited = can(actor, "refunds.decide.limited");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Refunds"
        description="Review and decide customer refund requests."
      />

      {!canDecideAny && !canDecideLimited ? (
        <Callout title="Read-only access">
          <p>You can review refunds but not approve or deny them.</p>
        </Callout>
      ) : null}

      {canDecideLimited ? (
        <Callout
          tone="warn"
          title={`Approval limit ${formatCents(OPS_REFUND_LIMIT_CENTS)}`}
        >
          <p>Requests at or above your limit have to go to an admin.</p>
        </Callout>
      ) : null}

      <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
        <RefundsTable
          canDecideAny={canDecideAny}
          canDecideLimited={canDecideLimited}
        />
      </Suspense>
    </div>
  );
}
