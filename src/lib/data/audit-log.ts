import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { ENTITY_TYPES } from "@/lib/domain";
import { requirePermission, type ActorContext } from "@/lib/policy";
import { paginate, paginationSchema, sortDirSchema, type Paginated } from "./query";

export const auditLogQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional().catch(undefined),
  entityType: z.enum(ENTITY_TYPES).optional().catch(undefined),
  actorId: z.string().trim().optional().catch(undefined),
  dir: sortDirSchema,
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export function parseAuditLogQuery(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): AuditLogQuery {
  const raw =
    params instanceof URLSearchParams
      ? Object.fromEntries(params.entries())
      : params;
  return auditLogQuerySchema.parse(raw);
}

export type AuditLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: string | null;
  after: string | null;
  createdAt: Date;
  actor: { name: string; role: string };
};

export async function listAuditLogs(
  actor: ActorContext,
  query: AuditLogQuery,
): Promise<Paginated<AuditLogRow>> {
  requirePermission(actor, "audit.read");

  const where: Prisma.AuditLogWhereInput = {};
  if (query.entityType) where.entityType = query.entityType;
  if (query.actorId) where.actorId = query.actorId;
  if (query.search) {
    where.OR = [
      { action: { contains: query.search } },
      { entityId: { contains: query.search } },
      { actor: { name: { contains: query.search } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: query.dir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        before: true,
        after: true,
        createdAt: true,
        actor: { select: { name: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return paginate(rows, total, query.page, query.pageSize);
}

/** Recent audit entries for a single entity, shown on detail pages. */
export async function listEntityAuditTrail(
  actor: ActorContext,
  entityType: string,
  entityId: string,
  take = 10,
) {
  requirePermission(actor, "audit.read");
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      before: true,
      after: true,
      createdAt: true,
      actor: { select: { name: true, role: true } },
    },
  });
}
