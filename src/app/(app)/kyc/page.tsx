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
        title="KYC Review Queue"
        description={
          full
            ? "Your role reads the full applicant record, including date of birth, document reference and risk notes."
            : "Your role reads name, status and submission date only: /api/kyc selects those four columns and never queries the sensitive ones."
        }
      />
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <KycTable />
      </Suspense>
    </div>
  );
}
