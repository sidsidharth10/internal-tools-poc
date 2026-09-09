import { Suspense } from "react";

import { PageHeader } from "@/components/ui";
import { can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

import { KycTable } from "./kyc-table";

export default async function KycPage() {
  const actor = await requireActor();
  const full = can(actor, "kyc.read.full");

  return (
    <div>
      <PageHeader
        title="KYC Review"
        description={
          full
            ? "Applicants awaiting identity verification."
            : "Applicants awaiting identity verification. Your role sees name and status only."
        }
      />
      <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
        <KycTable />
      </Suspense>
    </div>
  );
}
