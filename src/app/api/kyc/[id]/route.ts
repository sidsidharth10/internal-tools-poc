import { NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api";
import { getApplicant } from "@/lib/data/kyc";
import { requireActor } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const { visibility, applicant } = await getApplicant(actor, id);
    return NextResponse.json({ visibility, ...applicant });
  });
}
