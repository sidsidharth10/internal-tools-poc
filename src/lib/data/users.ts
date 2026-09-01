import { prisma } from "@/lib/db";

/**
 * Unauthenticated by design: this powers the POC's "pick a user" login dropdown,
 * standing in for a real identity provider. It exposes nothing beyond the seeded
 * demo identities.
 */
export async function listLoginUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
}
