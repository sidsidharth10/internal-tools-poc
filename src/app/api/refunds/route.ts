import { NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api";
import { listRefunds, parseRefundQuery } from "@/lib/data/refunds";
import { requireActor } from "@/lib/session";

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const query = parseRefundQuery(new URL(request.url).searchParams);
    return NextResponse.json(await listRefunds(actor, query));
  });
}
