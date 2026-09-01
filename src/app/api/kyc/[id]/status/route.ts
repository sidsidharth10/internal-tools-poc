import { NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api";
import { kycStatusInputSchema, updateApplicantStatus } from "@/lib/data/kyc";
import { requireActor } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const { status } = kycStatusInputSchema.parse(await request.json());
    return NextResponse.json(await updateApplicantStatus(actor, id, status));
  });
}
