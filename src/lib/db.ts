import "server-only";

import { PrismaClient } from "@/generated/prisma";
import { currentAuditIntent } from "@/lib/audit-context";

const MUTATING_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

export class UnauditedMutationError extends Error {
  constructor(model: string, operation: string) {
    super(
      `Refusing to run ${model}.${operation}: no audit intent on the current context. ` +
        `Mutations must go through auditedMutate() in src/lib/audit.ts.`,
    );
    this.name = "UnauditedMutationError";
  }
}

function createClient() {
  return new PrismaClient().$extends({
    name: "audit-guard",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            model !== "AuditLog" &&
            MUTATING_OPERATIONS.has(operation) &&
            !currentAuditIntent()
          ) {
            throw new UnauditedMutationError(model, operation);
          }
          return query(args);
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** A Prisma client bound to an open interactive transaction. */
export type Tx = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
