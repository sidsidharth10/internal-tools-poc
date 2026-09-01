import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { roleSchema } from "@/lib/domain";
import { UnauthenticatedError, type ActorContext } from "@/lib/policy";

export type SessionData = {
  userId?: string;
};

const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "poc-development-session-secret-change-me-32+",
  cookieName: "internal_tools_poc_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/**
 * Resolves the actor from the session cookie on every request. The cookie only
 * carries a user id — the role is always re-read from the database, so a stale or
 * tampered cookie cannot grant a role.
 */
export async function getActor(): Promise<ActorContext | null> {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;

  const role = roleSchema.safeParse(user.role);
  if (!role.success) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role.data,
  };
}

export async function requireActor(): Promise<ActorContext> {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  return actor;
}
