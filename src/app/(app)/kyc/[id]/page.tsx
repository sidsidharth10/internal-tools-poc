import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AuditTrail } from "@/components/audit-trail";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  Mono,
  PageHeader,
} from "@/components/ui";
import { listEntityAuditTrail } from "@/lib/data/audit-log";
import { getApplicant } from "@/lib/data/kyc";
import type { KycStatus } from "@/lib/domain";
import { NotFoundError, can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

import { STATUS_TONES } from "../status";
import { StatusControl } from "./status-control";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
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
        eyebrow="KYC Review"
        title={applicant.fullName}
        description={`Applicant ${applicant.id}`}
        actions={
          <Link href="/kyc">
            <Button variant="secondary" size="sm">
              Back to queue
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader
          title="Applicant record"
          description={
            result.visibility === "full"
              ? "Full record: your role is permitted every column."
              : "Summary record: the sensitive columns are never selected for your role."
          }
          actions={
            <Badge tone={result.visibility === "full" ? "green" : "amber"} dot>
              {result.visibility === "full" ? "full detail" : "redacted"}
            </Badge>
          }
        />
        <dl className="grid gap-x-8 gap-y-3 px-5 py-4 sm:grid-cols-2">
          <Field label="Status">
            <Badge tone={STATUS_TONES[applicant.status as KycStatus]} dot>
              {applicant.status.replace("_", " ")}
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
                <span className="font-mono text-[0.8rem]">
                  {result.applicant.documentRef}
                </span>
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
        <Callout tone="warn" title="Redacted at the query layer">
          <p>
            Date of birth, country, document type, document reference and risk
            notes are absent from the API response for role {actor.role}:{" "}
            <Mono>GET /api/kyc/{applicant.id}</Mono> selects only id, fullName,
            status and submittedAt, so those columns are never read from the
            database. Nothing is being hidden here by the page.
          </p>
        </Callout>
      ) : null}

      {can(actor, "kyc.decide") ? (
        <Card>
          <CardHeader
            title="Decision"
            description={
              <>
                Requires <Mono>kyc.decide</Mono>; every change is written
                through the audited mutation path as{" "}
                <Mono>kyc.status_change</Mono>.
              </>
            }
          />
          <div className="px-5 py-4">
            <StatusControl id={applicant.id} current={applicant.status} />
          </div>
        </Card>
      ) : null}

      {trail ? <AuditTrail entries={trail} /> : null}
    </div>
  );
}
