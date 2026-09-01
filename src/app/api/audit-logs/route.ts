import { NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api";
import { listAuditLogs, parseAuditLogQuery } from "@/lib/data/audit-log";
import { requireActor } from "@/lib/session";

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const query = parseAuditLogQuery(new URL(request.url).searchParams);
    return NextResponse.json(await listAuditLogs(actor, query));
  });
}
