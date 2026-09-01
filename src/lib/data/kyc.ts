import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { auditedMutate } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { kycStatusSchema, type KycStatus } from "@/lib/domain";
import {
  ForbiddenError,
  NotFoundError,
  can,
  requirePermission,
  type ActorContext,
} from "@/lib/policy";
import { paginate, paginationSchema, sortDirSchema, type Paginated } from "./query";

/**
 * The redaction is the `select` itself. A caller holding only `kyc.read.redacted`
 * causes a query that never names the sensitive columns, so they are not read out
 * of the database and there is nothing to strip from the response afterwards.
 */
const REDACTED_SELECT = {
  id: true,
  fullName: true,
  status: true,
  submittedAt: true,
} satisfies Prisma.KycApplicantSelect;

const FULL_SELECT = {
  ...REDACTED_SELECT,
  dateOfBirth: true,
  country: true,
  documentType: true,
  documentRef: true,
  riskNotes: true,
  reviewedById: true,
  reviewedByName: true,
  reviewedAt: true,
} satisfies Prisma.KycApplicantSelect;

export type KycRedactedApplicant = Prisma.KycApplicantGetPayload<{
  select: typeof REDACTED_SELECT;
}>;
export type KycFullApplicant = Prisma.KycApplicantGetPayload<{
  select: typeof FULL_SELECT;
}>;

export type KycVisibility = "full" | "redacted";

/**
 * Picks the visibility the actor is entitled to, refusing anyone holding neither
 * KYC read permission.
 */
function resolveVisibility(actor: ActorContext): KycVisibility {
  if (can(actor, "kyc.read.full")) return "full";
  if (can(actor, "kyc.read.redacted")) return "redacted";
  throw new ForbiddenError(`Role "${actor.role}" is not permitted to read KYC applicants`);
}

const SORTABLE = ["submittedAt", "status", "fullName"] as const;

export const kycQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional().catch(undefined),
  status: kycStatusSchema.optional().catch(undefined),
  sort: z.enum(SORTABLE).catch("submittedAt").default("submittedAt"),
  dir: sortDirSchema,
});

export type KycQuery = z.infer<typeof kycQuerySchema>;

export function parseKycQuery(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): KycQuery {
  const raw =
    params instanceof URLSearchParams
      ? Object.fromEntries(params.entries())
      : params;
  return kycQuerySchema.parse(raw);
}

export type KycListResult =
  | ({ visibility: "full" } & Paginated<KycFullApplicant>)
  | ({ visibility: "redacted" } & Paginated<KycRedactedApplicant>);

export async function listApplicants(
  actor: ActorContext,
  query: KycQuery,
): Promise<KycListResult> {
  const visibility = resolveVisibility(actor);

  const where: Prisma.KycApplicantWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.search) where.fullName = { contains: query.search };

  const findMany = {
    where,
    orderBy: { [query.sort]: query.dir },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
  const total = prisma.kycApplicant.count({ where });

  if (visibility === "redacted") {
    const [rows, count] = await Promise.all([
      prisma.kycApplicant.findMany({ ...findMany, select: REDACTED_SELECT }),
      total,
    ]);
    return {
      visibility,
      ...paginate(rows, count, query.page, query.pageSize),
    };
  }

  const [rows, count] = await Promise.all([
    prisma.kycApplicant.findMany({ ...findMany, select: FULL_SELECT }),
    total,
  ]);
  return { visibility, ...paginate(rows, count, query.page, query.pageSize) };
}

export type KycApplicantResult =
  | { visibility: "full"; applicant: KycFullApplicant }
  | { visibility: "redacted"; applicant: KycRedactedApplicant };

export async function getApplicant(
  actor: ActorContext,
  id: string,
): Promise<KycApplicantResult> {
  const visibility = resolveVisibility(actor);

  if (visibility === "redacted") {
    const applicant = await prisma.kycApplicant.findUnique({
      where: { id },
      select: REDACTED_SELECT,
    });
    if (!applicant) throw new NotFoundError("Applicant not found");
    return { visibility, applicant };
  }

  const applicant = await prisma.kycApplicant.findUnique({
    where: { id },
    select: FULL_SELECT,
  });
  if (!applicant) throw new NotFoundError("Applicant not found");
  return { visibility, applicant };
}

export const kycStatusInputSchema = z.object({ status: kycStatusSchema });

export async function updateApplicantStatus(
  actor: ActorContext,
  id: string,
  status: KycStatus,
): Promise<KycFullApplicant> {
  requirePermission(actor, "kyc.decide");

  const existing = await prisma.kycApplicant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Applicant not found");

  return auditedMutate({
    actor,
    action: "kyc.status_change",
    entityType: "KycApplicant",
    entityId: id,
    loadBefore: (tx) =>
      tx.kycApplicant.findUnique({ where: { id }, select: FULL_SELECT }),
    run: (tx) =>
      tx.kycApplicant.update({
        where: { id },
        data: {
          status,
          reviewedById: actor.id,
          reviewedByName: actor.name,
          reviewedAt: new Date(),
        },
        select: FULL_SELECT,
      }),
  });
}
