import { NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api";
import { decideRefund, refundDecisionSchema } from "@/lib/data/refunds";
import { requireActor } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const { decision } = refundDecisionSchema.parse(await request.json());
    return NextResponse.json(await decideRefund(actor, id, decision));
  });
}
