import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AuditTrail } from "@/components/audit-trail";
import { Badge, Button, Callout, Card, PageHeader } from "@/components/ui";
import { listEntityAuditTrail } from "@/lib/data/audit-log";
import { getApplicant } from "@/lib/data/kyc";
import type { KycStatus } from "@/lib/domain";
import { NotFoundError, can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

import { STATUS_TONES } from "../status";
import { StatusControl } from "./status-control";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

export default async function KycDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;

  const result = await getApplicant(actor, id).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const { applicant } = result;
  const trail = can(actor, "audit.read")
    ? await listEntityAuditTrail(actor, "KycApplicant", id)
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={applicant.fullName}
        description={`Applicant ${applicant.id}`}
        actions={
          <Link href="/kyc">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <Badge tone={STATUS_TONES[applicant.status as KycStatus]}>
              {applicant.status}
            </Badge>
          </Field>
          <Field label="Submitted">
            {new Date(applicant.submittedAt).toLocaleString()}
          </Field>

          {result.visibility === "full" ? (
            <>
              <Field label="Date of birth">
                {new Date(result.applicant.dateOfBirth).toLocaleDateString()}
              </Field>
              <Field label="Country">{result.applicant.country}</Field>
              <Field label="Document type">
                {result.applicant.documentType}
              </Field>
              <Field label="Document reference">
                <span className="font-mono">{result.applicant.documentRef}</span>
              </Field>
              <Field label="Risk notes">{result.applicant.riskNotes}</Field>
              <Field label="Last reviewed">
                {result.applicant.reviewedAt
                  ? `${new Date(result.applicant.reviewedAt).toLocaleString()}${
                      result.applicant.reviewedByName
                        ? ` · ${result.applicant.reviewedByName}`
                        : ""
                    }`
                  : "—"}
              </Field>
            </>
          ) : null}
        </dl>
      </Card>

      {result.visibility === "redacted" ? (
        <Callout title="Redacted at the query layer">
          <p>
            Date of birth, country, document type, document reference and risk
            notes are absent from the API response for role {actor.role}:{" "}
            <code>GET /api/kyc/{applicant.id}</code> selects only id, fullName,
            status and submittedAt, so those columns are never read from the
            database. Nothing is being hidden here by the page.
          </p>
        </Callout>
      ) : null}

      {can(actor, "kyc.decide") ? (
        <Card className="p-4">
          <h2 className="font-semibold text-slate-900">Decision</h2>
          <p className="mt-1 mb-3 text-sm text-slate-600">
            Requires <code>kyc.decide</code>; every change is written through
            the audited mutation path as <code>kyc.status_change</code>.
          </p>
          <StatusControl id={applicant.id} current={applicant.status} />
        </Card>
      ) : null}

      {trail ? <AuditTrail entries={trail} /> : null}
    </div>
  );
}
