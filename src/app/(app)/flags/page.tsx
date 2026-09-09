import Link from "next/link";
import { Suspense } from "react";

import { Button, PageHeader } from "@/components/ui";
import { can } from "@/lib/policy";
import { requireActor } from "@/lib/session";

import { FlagsTable } from "./flags-table";

export default async function FlagsPage() {
  const actor = await requireActor();
  const canWrite = can(actor, "flags.write");
  const canDelete = can(actor, "flags.delete");

  return (
    <div>
      <PageHeader
        title="Feature Flags"
        description="Runtime configuration across dev, staging and production."
        actions={
          canWrite ? (
            <Link href="/flags/new">
              <Button>New flag</Button>
            </Link>
          ) : null
        }
      />
      <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
        <FlagsTable canWrite={canWrite} canDelete={canDelete} />
      </Suspense>
    </div>
  );
}
