import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { auditedMutate } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { environmentSchema } from "@/lib/domain";
import {
  ConflictError,
  NotFoundError,
  requirePermission,
  type ActorContext,
} from "@/lib/policy";
import { paginate, paginationSchema, sortDirSchema, type Paginated } from "./query";

const SORTABLE = ["key", "name", "environment", "enabled", "updatedAt"] as const;

export const featureFlagQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional().catch(undefined),
  environment: environmentSchema.optional().catch(undefined),
  enabled: z
    .enum(["true", "false"])
    .optional()
    .catch(undefined)
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z.enum(SORTABLE).catch("updatedAt").default("updatedAt"),
  dir: sortDirSchema,
});

export type FeatureFlagQuery = z.infer<typeof featureFlagQuerySchema>;

export function parseFeatureFlagQuery(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): FeatureFlagQuery {
  const raw =
    params instanceof URLSearchParams
      ? Object.fromEntries(params.entries())
      : params;
  return featureFlagQuerySchema.parse(raw);
}

function buildWhere(query: FeatureFlagQuery): Prisma.FeatureFlagWhereInput {
  const where: Prisma.FeatureFlagWhereInput = {};

  if (query.environment) where.environment = query.environment;
  if (query.enabled !== undefined) where.enabled = query.enabled;
  if (query.search) {
    where.OR = [
      { key: { contains: query.search } },
      { name: { contains: query.search } },
      { description: { contains: query.search } },
    ];
  }

  return where;
}

export type FeatureFlagRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: string;
  updatedByName: string | null;
  updatedAt: Date;
};

export async function listFeatureFlags(
  actor: ActorContext,
  query: FeatureFlagQuery,
): Promise<Paginated<FeatureFlagRow>> {
  requirePermission(actor, "flags.read");

  const where = buildWhere(query);
  const [rows, total] = await Promise.all([
    prisma.featureFlag.findMany({
      where,
      orderBy: { [query.sort]: query.dir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        enabled: true,
        environment: true,
        updatedByName: true,
        updatedAt: true,
      },
    }),
    prisma.featureFlag.count({ where }),
  ]);

  return paginate(rows, total, query.page, query.pageSize);
}

export async function getFeatureFlag(actor: ActorContext, id: string) {
  requirePermission(actor, "flags.read");
  const flag = await prisma.featureFlag.findUnique({ where: { id } });
  if (!flag) throw new NotFoundError("Feature flag not found");
  return flag;
}

const featureFlagFields = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9_.-]+$/, "Use lowercase letters, numbers, . _ -"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500),
  enabled: z.boolean(),
  environment: environmentSchema,
});

export const featureFlagInputSchema = featureFlagFields.extend({
  description: featureFlagFields.shape.description.default(""),
  enabled: featureFlagFields.shape.enabled.default(false),
});

/**
 * Built from the undefaulted fields: `.partial()` keeps a field's `.default()`,
 * so patching from the defaulted schema would write those defaults over columns
 * the caller never mentioned.
 */
export const featureFlagPatchSchema = featureFlagFields.partial();

export type FeatureFlagInput = z.infer<typeof featureFlagInputSchema>;
export type FeatureFlagPatch = z.infer<typeof featureFlagPatchSchema>;

/**
 * Structural rather than `instanceof`: the bundler can load the generated Prisma
 * runtime more than once, so the thrown error is not always the same class object.
 */
function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Error &&
    error.name === "PrismaClientKnownRequestError" &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function withKeyConflict<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictError(
        "A feature flag with that key already exists in this environment.",
      );
    }
    throw error;
  }
}

export async function createFeatureFlag(
  actor: ActorContext,
  input: FeatureFlagInput,
) {
  requirePermission(actor, "flags.write");

  return withKeyConflict(() =>
    auditedMutate({
      actor,
      action: "feature_flag.create",
      entityType: "FeatureFlag",
      run: (tx) =>
        tx.featureFlag.create({
          data: {
            ...input,
            updatedById: actor.id,
            updatedByName: actor.name,
          },
        }),
      resolveEntityId: (flag) => flag.id,
    }),
  );
}

export async function updateFeatureFlag(
  actor: ActorContext,
  id: string,
  input: FeatureFlagPatch,
) {
  requirePermission(actor, "flags.write");
  await getFeatureFlag(actor, id);

  return withKeyConflict(() =>
    auditedMutate({
      actor,
      action: "feature_flag.update",
      entityType: "FeatureFlag",
      entityId: id,
      loadBefore: (tx) => tx.featureFlag.findUnique({ where: { id } }),
      run: (tx) =>
        tx.featureFlag.update({
          where: { id },
          data: {
            ...input,
            updatedById: actor.id,
            updatedByName: actor.name,
          },
        }),
    }),
  );
}

export async function setFeatureFlagEnabled(
  actor: ActorContext,
  id: string,
  enabled: boolean,
) {
  requirePermission(actor, "flags.write");
  await getFeatureFlag(actor, id);

  return auditedMutate({
    actor,
    action: "feature_flag.toggle",
    entityType: "FeatureFlag",
    entityId: id,
    loadBefore: (tx) => tx.featureFlag.findUnique({ where: { id } }),
    run: (tx) =>
      tx.featureFlag.update({
        where: { id },
        data: { enabled, updatedById: actor.id, updatedByName: actor.name },
      }),
  });
}

export async function deleteFeatureFlag(actor: ActorContext, id: string) {
  requirePermission(actor, "flags.delete");
  await getFeatureFlag(actor, id);

  return auditedMutate({
    actor,
    action: "feature_flag.delete",
    entityType: "FeatureFlag",
    entityId: id,
    loadBefore: (tx) => tx.featureFlag.findUnique({ where: { id } }),
    loadAfter: async () => null,
    run: (tx) => tx.featureFlag.delete({ where: { id } }),
  });
}
