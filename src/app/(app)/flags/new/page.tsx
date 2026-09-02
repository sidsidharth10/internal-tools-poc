import Link from "next/link";

import { ResourceForm } from "@/components/resource-form";
import { Button, Card, PageHeader } from "@/components/ui";
import { ENVIRONMENTS } from "@/lib/domain";
import { can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

export default async function NewFlagPage() {
  const actor = await requireActor();

  if (!can(actor, "flags.write")) {
    return (
      <Card className="p-5 text-sm text-ink-soft">
        Your role ({actor.role}) cannot create feature flags.
      </Card>
    );
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        eyebrow="Feature Flags"
        title="New feature flag"
        description="Keys are unique per environment; a duplicate returns 409 from the API."
      />
      <Card className="p-5">
        <ResourceForm
          endpoint="/api/feature-flags"
          method="POST"
          submitLabel="Create flag"
          redirectTo="/flags"
          initialValues={{
            key: "",
            name: "",
            description: "",
            environment: "dev",
            enabled: false,
          }}
          fields={[
            {
              type: "text",
              name: "key",
              label: "Key",
              placeholder: "instant_payouts",
              help: "Lowercase letters, numbers, dot, underscore or dash. Unique per environment.",
            },
            { type: "text", name: "name", label: "Name" },
            { type: "textarea", name: "description", label: "Description" },
            {
              type: "select",
              name: "environment",
              label: "Environment",
              options: ENVIRONMENTS.map((env) => ({ value: env, label: env })),
            },
            { type: "checkbox", name: "enabled", label: "Enabled" },
          ]}
          secondaryAction={
            <Link href="/flags">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
}
