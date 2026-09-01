/**
 * Demonstrates that role enforcement lives in the API/query layer, not the UI.
 *
 * Start the dev server, then run `npm run proof`. Every assertion below is made
 * against real HTTP requests, so a passing run is evidence that an unauthorised
 * caller cannot retrieve or mutate rows even with the UI bypassed entirely.
 */
import { PrismaClient } from "../src/generated/prisma";
import { OPS_REFUND_LIMIT_CENTS } from "../src/lib/domain";

const BASE_URL = process.env.PROOF_BASE_URL ?? "http://localhost:3000";

const prisma = new PrismaClient();

type Check = {
  name: string;
  expected: string;
  actual: string;
  ok: boolean;
};

const checks: Check[] = [];

function record(name: string, expected: string, actual: string) {
  checks.push({ name, expected, actual, ok: expected === actual });
}

async function login(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const response = await fetch(`${BASE_URL}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: user.id }),
  });
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error(`Login failed for ${email}`);
  return cookie.split(";")[0];
}

async function call(
  cookie: string | null,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function main() {
  const admin = await login("ada@examplebank.test");
  const ops = await login("mateo@examplebank.test");
  const compliance = await login("hannah@examplebank.test");

  // 1. No session at all.
  const anonymous = await call(null, "/api/feature-flags");
  record("anonymous GET /api/feature-flags", "401", String(anonymous.status));

  // 2. Audit log is admin-only, at the API, not just missing from the nav.
  const opsAudit = await call(ops, "/api/audit-logs");
  record("ops GET /api/audit-logs", "403", String(opsAudit.status));
  const complianceAudit = await call(compliance, "/api/audit-logs");
  record("compliance GET /api/audit-logs", "403", String(complianceAudit.status));
  const adminAudit = await call(admin, "/api/audit-logs");
  record("admin GET /api/audit-logs", "200", String(adminAudit.status));

  // 3. Flag writes: ops and admin may write, compliance may not.
  const key = `proof_${Date.now()}`;
  const complianceCreate = await call(compliance, "/api/feature-flags", {
    method: "POST",
    body: JSON.stringify({
      key,
      name: "Proof flag",
      description: "Created by scripts/proof.ts",
      environment: "dev",
      enabled: false,
    }),
  });
  record("compliance POST /api/feature-flags", "403", String(complianceCreate.status));

  const opsCreate = await call(ops, "/api/feature-flags", {
    method: "POST",
    body: JSON.stringify({
      key,
      name: "Proof flag",
      description: "Created by scripts/proof.ts",
      environment: "dev",
      enabled: false,
    }),
  });
  record("ops POST /api/feature-flags", "201", String(opsCreate.status));
  const created = opsCreate.body as { id: string } | null;

  if (created?.id) {
    // 4. A duplicate key in the same environment is a 409, not a 500.
    const duplicate = await call(ops, "/api/feature-flags", {
      method: "POST",
      body: JSON.stringify({
        key,
        name: "Duplicate proof flag",
        environment: "dev",
      }),
    });
    record("duplicate key POST /api/feature-flags", "409", String(duplicate.status));

    // 5. A partial PATCH leaves the fields it does not mention alone.
    const patched = await call(ops, `/api/feature-flags/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: true }),
    });
    const afterPatch = patched.body as { description: string } | null;
    record(
      "PATCH {enabled} preserves description",
      "Created by scripts/proof.ts",
      String(afterPatch?.description),
    );

    // 6. Deletes are admin-only.
    const opsDelete = await call(ops, `/api/feature-flags/${created.id}`, {
      method: "DELETE",
    });
    record("ops DELETE /api/feature-flags/:id", "403", String(opsDelete.status));

    const adminDelete = await call(admin, `/api/feature-flags/${created.id}`, {
      method: "DELETE",
    });
    record("admin DELETE /api/feature-flags/:id", "200", String(adminDelete.status));

    // 7. The create, the patch and the delete were all audited automatically.
    const entries = await prisma.auditLog.count({
      where: { entityType: "FeatureFlag", entityId: created.id },
    });
    record("audit rows written for the flag", "3", String(entries));
  }

  // 8. Server-side filtering: the API returns a filtered page, not the whole table.
  const filtered = await call(
    admin,
    "/api/feature-flags?environment=prod&pageSize=10",
  );
  const page = filtered.body as { rows: unknown[]; total: number } | null;
  record(
    "GET ?environment=prod&pageSize=10 returns 10 rows",
    "10",
    String(page?.rows.length),
  );
  record(
    "…out of a larger total counted in SQL",
    "true",
    String((page?.total ?? 0) > 10),
  );

  // 7. Refund decisions are gated on role *and* on the amount of the request.
  const smallRefund = await prisma.refundRequest.findFirstOrThrow({
    where: { status: "pending", amountCents: { lt: OPS_REFUND_LIMIT_CENTS } },
    orderBy: { requestedAt: "asc" },
  });
  const largeRefund = await prisma.refundRequest.findFirstOrThrow({
    where: { status: "pending", amountCents: { gte: OPS_REFUND_LIMIT_CENTS } },
    orderBy: { requestedAt: "asc" },
  });

  const decide = (cookie: string, id: string, decision: string) =>
    call(cookie, `/api/refunds/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });

  const complianceDecision = await decide(compliance, smallRefund.id, "approved");
  record(
    "compliance POST /api/refunds/:id/decision",
    "403",
    String(complianceDecision.status),
  );

  const opsSmall = await decide(ops, smallRefund.id, "approved");
  record("ops decides a refund under the limit", "200", String(opsSmall.status));

  const opsLarge = await decide(ops, largeRefund.id, "approved");
  record("ops decides a refund over the limit", "403", String(opsLarge.status));

  const adminLarge = await decide(admin, largeRefund.id, "denied");
  record(
    "admin decides the same large refund",
    "200",
    String(adminLarge.status),
  );

  // 8. A decided refund cannot be silently decided again.
  const repeat = await decide(admin, largeRefund.id, "approved");
  record("admin re-decides an already-denied refund", "409", String(repeat.status));

  // 9. The transition is in the audit log, with before/after snapshots.
  const decisionLog = await prisma.auditLog.findFirst({
    where: { entityType: "RefundRequest", entityId: largeRefund.id },
    orderBy: { createdAt: "desc" },
  });
  record("audit row action for the large refund", "refund.deny", String(decisionLog?.action));
  const before = decisionLog?.before ? JSON.parse(decisionLog.before) : null;
  const after = decisionLog?.after ? JSON.parse(decisionLog.after) : null;
  record(
    "audit row records the status transition",
    "pending -> denied",
    `${before?.status} -> ${after?.status}`,
  );

  // 10. Refund filtering happens in SQL: an amount range narrows the counted total.
  const allRefunds = await call(admin, "/api/refunds?pageSize=10");
  const overThousand = await call(
    admin,
    "/api/refunds?minAmount=1000&pageSize=10",
  );
  const allPage = allRefunds.body as { rows: unknown[]; total: number } | null;
  const filteredPage = overThousand.body as {
    rows: { amountCents: number }[];
    total: number;
  } | null;
  record(
    "GET /api/refunds?minAmount=1000 returns 10 rows of a smaller total",
    "true",
    String(
      (filteredPage?.rows.length ?? 0) === 10 &&
        (filteredPage?.total ?? 0) < (allPage?.total ?? 0),
    ),
  );
  record(
    "…and every returned row respects the filter",
    "true",
    String(
      (filteredPage?.rows ?? []).every((row) => row.amountCents >= 100_000),
    ),
  );

  const width = Math.max(...checks.map((c) => c.name.length));
  for (const check of checks) {
    console.log(
      `${check.ok ? "PASS" : "FAIL"}  ${check.name.padEnd(width)}  expected ${check.expected}, got ${check.actual}`,
    );
  }

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
