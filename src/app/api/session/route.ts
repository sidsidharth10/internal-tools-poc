import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiErrors } from "@/lib/api";
import { findUserById } from "@/lib/data/users";
import { getActor, getSession } from "@/lib/session";

const loginSchema = z.object({ userId: z.string().min(1) });

export async function GET() {
  return withApiErrors(async () => {
    const actor = await getActor();
    return NextResponse.json({ actor });
  });
}

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const { userId } = loginSchema.parse(await request.json());
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "Unknown user" }, { status: 400 });
    }

    const session = await getSession();
    session.userId = user.id;
    await session.save();

    return NextResponse.json({
      actor: { id: user.id, name: user.name, role: user.role },
    });
  });
}

export async function DELETE() {
  return withApiErrors(async () => {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ ok: true });
  });
}
