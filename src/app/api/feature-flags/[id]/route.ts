import { NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api";
import {
  deleteFeatureFlag,
  featureFlagPatchSchema,
  getFeatureFlag,
  updateFeatureFlag,
} from "@/lib/data/feature-flags";
import { requireActor } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const { id } = await params;
    return NextResponse.json(await getFeatureFlag(actor, id));
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const input = featureFlagPatchSchema.parse(await request.json());
    return NextResponse.json(await updateFeatureFlag(actor, id, input));
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return withApiErrors(async () => {
    const actor = await requireActor();
    const { id } = await params;
    await deleteFeatureFlag(actor, id);
    return NextResponse.json({ ok: true });
  });
}
