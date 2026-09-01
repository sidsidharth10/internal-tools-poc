import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Describes the audited mutation currently in flight. The Prisma client refuses to
 * execute any write unless one of these is present on the async context, which is
 * what makes "every mutation is audited" a structural guarantee rather than a
 * convention. See src/lib/db.ts and src/lib/audit.ts.
 */
export type AuditIntent = {
  action: string;
  entityType: string;
};

// Cached on globalThis for the same reason the Prisma client is: dev-mode hot
// reloading re-evaluates modules, and a second AsyncLocalStorage instance would
// silently lose the context held by the already-instantiated Prisma client.
const globalForAudit = globalThis as unknown as {
  auditIntentStorage?: AsyncLocalStorage<AuditIntent>;
};

const storage = (globalForAudit.auditIntentStorage ??=
  new AsyncLocalStorage<AuditIntent>());

export function runWithAuditIntent<T>(
  intent: AuditIntent,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(intent, fn);
}

export function currentAuditIntent(): AuditIntent | undefined {
  return storage.getStore();
}
