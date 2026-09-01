import { runWithAuditIntent } from "@/lib/audit-context";
import { prisma, type Tx } from "@/lib/db";
import type { ActorContext } from "@/lib/policy";

type AuditedMutateParams<T> = {
  actor: ActorContext;
  /** Dotted action name, e.g. `feature_flag.update`. */
  action: string;
  /** Logical entity name, e.g. `FeatureFlag`. */
  entityType: string;
  /** Known up-front for updates/deletes; derived from the result for creates. */
  entityId?: string;
  loadBefore?: (tx: Tx) => Promise<unknown>;
  run: (tx: Tx) => Promise<T>;
  resolveEntityId?: (result: T) => string;
  loadAfter?: (tx: Tx, result: T) => Promise<unknown>;
};

function snapshot(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

/**
 * The only sanctioned way to write to the database. Runs the mutation and its
 * AuditLog row inside a single transaction, so a mutation can never be persisted
 * without its audit trail. The Prisma client (src/lib/db.ts) throws on any write
 * attempted outside of this helper.
 */
export async function auditedMutate<T>({
  actor,
  action,
  entityType,
  entityId,
  loadBefore,
  run,
  resolveEntityId,
  loadAfter,
}: AuditedMutateParams<T>): Promise<T> {
  return runWithAuditIntent({ action, entityType }, () =>
    prisma.$transaction(async (tx) => {
      const before = loadBefore ? await loadBefore(tx) : null;
      const result = await run(tx);
      const after = loadAfter ? await loadAfter(tx, result) : result;

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action,
          entityType,
          entityId: entityId ?? resolveEntityId?.(result) ?? "unknown",
          before: snapshot(before),
          after: snapshot(after),
        },
      });

      return result;
    }),
  );
}
