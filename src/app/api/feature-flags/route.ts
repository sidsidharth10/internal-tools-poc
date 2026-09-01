import { NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api";
import {
  createFeatureFlag,
  featureFlagInputSchema,
  listFeatureFlags,
  parseFeatureFlagQuery,
} from "@/lib/data/feature-flags";
import { requireActor } from "@/lib/session";

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const query = parseFeatureFlagQuery(new URL(request.url).searchParams);
    return NextResponse.json(await listFeatureFlags(actor, query));
  });
}

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const input = featureFlagInputSchema.parse(await request.json());
    const flag = await createFeatureFlag(actor, input);
    return NextResponse.json(flag, { status: 201 });
  });
}
