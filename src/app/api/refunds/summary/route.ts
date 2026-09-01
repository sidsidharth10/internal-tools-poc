import { NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api";
import { parseRefundQuery, summariseRefunds } from "@/lib/data/refunds";
import { requireActor } from "@/lib/session";

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const query = parseRefundQuery(new URL(request.url).searchParams);
    return NextResponse.json(await summariseRefunds(actor, query));
  });
}
