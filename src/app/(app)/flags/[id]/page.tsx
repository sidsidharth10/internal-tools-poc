import Link from "next/link";
import { notFound } from "next/navigation";

import { AuditTrail } from "@/components/audit-trail";
import { ResourceForm } from "@/components/resource-form";
import { Button, Card, PageHeader } from "@/components/ui";
import { listEntityAuditTrail } from "@/lib/data/audit-log";
import { getFeatureFlag } from "@/lib/data/feature-flags";
import { ENVIRONMENTS } from "@/lib/domain";
import { NotFoundError, can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

export default async function FlagDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;

  const flag = await getFeatureFlag(actor, id).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const canWrite = can(actor, "flags.write");
  const trail = can(actor, "audit.read")
    ? await listEntityAuditTrail(actor, "FeatureFlag", id)
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={flag.key}
        description={`${flag.name} · ${flag.environment}`}
        actions={
          <Link href="/flags">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <Card className="p-4">
        {!canWrite ? (
          <p className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Read-only: your role ({actor.role}) cannot modify feature flags.
          </p>
        ) : null}
        <ResourceForm
          endpoint={`/api/feature-flags/${flag.id}`}
          method="PATCH"
          submitLabel="Save changes"
          initialValues={{
            key: flag.key,
            name: flag.name,
            description: flag.description,
            environment: flag.environment,
            enabled: flag.enabled,
          }}
          fields={[
            { type: "text", name: "key", label: "Key", disabled: !canWrite },
            { type: "text", name: "name", label: "Name", disabled: !canWrite },
            {
              type: "textarea",
              name: "description",
              label: "Description",
              disabled: !canWrite,
            },
            {
              type: "select",
              name: "environment",
              label: "Environment",
              disabled: !canWrite,
              options: ENVIRONMENTS.map((env) => ({ value: env, label: env })),
            },
            {
              type: "checkbox",
              name: "enabled",
              label: "Enabled",
              disabled: !canWrite,
            },
          ]}
        />
      </Card>

      {trail ? <AuditTrail entries={trail} /> : null}
    </div>
  );
}
