import Link from "next/link";

import { Badge, Card, PageHeader } from "@/components/ui";
import {
  listFeatureFlags,
  parseFeatureFlagQuery,
} from "@/lib/data/feature-flags";
import { listApplicants, parseKycQuery } from "@/lib/data/kyc";
import { parseRefundQuery, summariseRefunds } from "@/lib/data/refunds";
import { ROLE_LABELS } from "@/lib/domain";
import { requireActor } from "@/lib/session";

export default async function HomePage() {
  const actor = await requireActor();

  const [flagsInProd, refunds, kyc] = await Promise.all([
    listFeatureFlags(
      actor,
      parseFeatureFlagQuery({
        environment: "prod",
        enabled: "true",
        pageSize: "1",
      }),
    ),
    summariseRefunds(actor, parseRefundQuery({})),
    listApplicants(actor, parseKycQuery({ status: "pending", pageSize: "1" })),
  ]);

  const apps = [
    {
      href: "/flags",
      title: "Feature Flags",
      description:
        "Turn functionality on and off per environment without a deploy.",
      metric: `${flagsInProd.total} enabled in production`,
    },
    {
      href: "/refunds",
      title: "Refunds",
      description: "Review customer refund requests and approve or deny them.",
      metric: `${refunds.byStatus.pending.toLocaleString()} awaiting a decision`,
    },
    {
      href: "/kyc",
      title: "KYC Review",
      description:
        "Work the queue of applicants awaiting identity verification.",
      metric: `${kyc.total} pending applicants`,
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title={`Welcome, ${actor.name.split(" ")[0]}`}
        description="Pick a tool to get started."
        actions={
          <Badge tone="blue" dot>
            {ROLE_LABELS[actor.role]}
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {apps.map((app) => (
          <Link
            key={app.href}
            href={app.href}
            className="group rounded-card focus-visible:outline-none"
          >
            <Card className="flex h-full flex-col p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-brand-200 group-hover:shadow-raised">
              <h2 className="text-sm font-semibold text-ink">{app.title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                {app.description}
              </p>
              <p className="mt-4 text-xs font-medium text-ink-muted">
                {app.metric}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
