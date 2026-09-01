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
        title="Refunds Dashboard"
        description={`5,200 seeded requests, filtered, sorted, counted and paginated in SQL. Deciding a refund is gated on role and on value: ops under ${formatCents(
          OPS_REFUND_LIMIT_CENTS,
        )}, admin any amount, compliance never — and only while the request is still pending.`}
      />

      {!canDecideAny && !canDecideLimited ? (
        <Callout title="Read-only">
          <p>
            Your role may read refunds but not decide them. The buttons are
            disabled, and <code>POST /api/refunds/:id/decision</code> returns 403
            regardless of what the UI shows.
          </p>
        </Callout>
      ) : null}

      {canDecideLimited ? (
        <Callout title={`Decision limit: ${formatCents(OPS_REFUND_LIMIT_CENTS)}`}>
          <p>
            Approve and Deny stay clickable on larger requests on purpose. The
            API is what refuses them, and its 403 message is shown above the
            table.
          </p>
        </Callout>
      ) : null}

      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <RefundsTable
          canDecideAny={canDecideAny}
          canDecideLimited={canDecideLimited}
        />
      </Suspense>
    </div>
  );
}
