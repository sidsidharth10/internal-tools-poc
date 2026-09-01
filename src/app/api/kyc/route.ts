import { NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api";
import { listApplicants, parseKycQuery } from "@/lib/data/kyc";
import { requireActor } from "@/lib/session";

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const query = parseKycQuery(new URL(request.url).searchParams);
    return NextResponse.json(await listApplicants(actor, query));
  });
}
