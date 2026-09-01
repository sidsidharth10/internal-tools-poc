import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { auditedMutate } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { refundStatusSchema, type RefundStatus } from "@/lib/domain";
import {
  NotFoundError,
  assertCanDecideRefund,
  requirePermission,
  type ActorContext,
} from "@/lib/policy";
import { paginate, paginationSchema, sortDirSchema, type Paginated } from "./query";

const SORTABLE = [
  "requestedAt",
  "amountCents",
  "status",
  "customerRef",
] as const;

/** Amounts are entered in dollars in the UI and stored in minor units. */
const dollarsToCents = z
  .string()
  .trim()
  .optional()
  .catch(undefined)
  .transform((value) => {
    if (!value) return undefined;
    const dollars = Number(value);
    if (!Number.isFinite(dollars) || dollars < 0) return undefined;
    return Math.round(dollars * 100);
  });

function boundaryDate(value: string, endOfDay: boolean): Date | undefined {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
    : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const dateBoundary = (endOfDay: boolean) =>
  z
    .string()
    .trim()
    .optional()
    .catch(undefined)
    .transform((value) => (value ? boundaryDate(value, endOfDay) : undefined));

export const refundQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional().catch(undefined),
  status: refundStatusSchema.optional().catch(undefined),
  minAmount: dollarsToCents,
  maxAmount: dollarsToCents,
  from: dateBoundary(false),
  to: dateBoundary(true),
  sort: z.enum(SORTABLE).catch("requestedAt").default("requestedAt"),
  dir: sortDirSchema,
});

export type RefundQuery = z.infer<typeof refundQuerySchema>;

export function parseRefundQuery(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): RefundQuery {
  const raw =
    params instanceof URLSearchParams
      ? Object.fromEntries(params.entries())
      : params;
  return refundQuerySchema.parse(raw);
}

/**
 * Every filter is translated into SQL: the browser never receives rows it then
 * has to filter, which is the point at 5,200 rows.
 */
function buildWhere(query: RefundQuery): Prisma.RefundRequestWhereInput {
  const where: Prisma.RefundRequestWhereInput = {};

  if (query.status) where.status = query.status;

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    where.amountCents = {
      ...(query.minAmount !== undefined ? { gte: query.minAmount } : {}),
      ...(query.maxAmount !== undefined ? { lte: query.maxAmount } : {}),
    };
  }

  if (query.from || query.to) {
    where.requestedAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }

  if (query.search) where.customerRef = { contains: query.search };

  return where;
}

export type RefundRow = {
  id: string;
  customerRef: string;
  amountCents: number;
  reason: string;
  status: string;
  requestedAt: Date;
  decidedByName: string | null;
  decidedAt: Date | null;
};

export async function listRefunds(
  actor: ActorContext,
  query: RefundQuery,
): Promise<Paginated<RefundRow>> {
  requirePermission(actor, "refunds.read");

  const where = buildWhere(query);
  const [rows, total] = await Promise.all([
    prisma.refundRequest.findMany({
      where,
      orderBy: { [query.sort]: query.dir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        customerRef: true,
        amountCents: true,
        reason: true,
        status: true,
        requestedAt: true,
        decidedByName: true,
        decidedAt: true,
      },
    }),
    prisma.refundRequest.count({ where }),
  ]);

  return paginate(rows, total, query.page, query.pageSize);
}

export type RefundSummary = {
  total: number;
  byStatus: Record<RefundStatus, number>;
  pendingValueCents: number;
};

/** Counts by status for the current filter, aggregated in SQL rather than in JS. */
export async function summariseRefunds(
  actor: ActorContext,
  query: RefundQuery,
): Promise<RefundSummary> {
  requirePermission(actor, "refunds.read");

  const where = buildWhere(query);
  const grouped = await prisma.refundRequest.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
    _sum: { amountCents: true },
  });

  const byStatus: Record<RefundStatus, number> = {
    pending: 0,
    approved: 0,
    denied: 0,
  };
  let total = 0;
  let pendingValueCents = 0;

  for (const group of grouped) {
    const status = refundStatusSchema.safeParse(group.status);
    total += group._count._all;
    if (!status.success) continue;
    byStatus[status.data] = group._count._all;
    if (status.data === "pending") {
      pendingValueCents = group._sum.amountCents ?? 0;
    }
  }

  return { total, byStatus, pendingValueCents };
}

export async function getRefund(actor: ActorContext, id: string) {
  requirePermission(actor, "refunds.read");
  const refund = await prisma.refundRequest.findUnique({ where: { id } });
  if (!refund) throw new NotFoundError("Refund request not found");
  return refund;
}

export const refundDecisionSchema = z.object({
  decision: z.enum(["approved", "denied"]),
});

export type RefundDecision = z.infer<typeof refundDecisionSchema>["decision"];

export class InvalidTransitionError extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

/**
 * The workflow step that differentiates this app from CRUD: a decision is gated on
 * the actor's role *and* on the value of the request, and is only legal from
 * `pending`. Both rules run here, in the data layer, before any write.
 */
export async function decideRefund(
  actor: ActorContext,
  id: string,
  decision: RefundDecision,
) {
  requirePermission(actor, "refunds.read");

  const refund = await prisma.refundRequest.findUnique({ where: { id } });
  if (!refund) throw new NotFoundError("Refund request not found");

  assertCanDecideRefund(actor, refund.amountCents);

  if (refund.status !== "pending") {
    throw new InvalidTransitionError(
      `Refund ${refund.customerRef} is already ${refund.status} and cannot be decided again`,
    );
  }

  return auditedMutate({
    actor,
    action: decision === "approved" ? "refund.approve" : "refund.deny",
    entityType: "RefundRequest",
    entityId: id,
    loadBefore: (tx) => tx.refundRequest.findUnique({ where: { id } }),
    run: (tx) =>
      tx.refundRequest.update({
        where: { id, status: "pending" },
        data: {
          status: decision,
          decidedById: actor.id,
          decidedByName: actor.name,
          decidedAt: new Date(),
        },
      }),
  });
}
