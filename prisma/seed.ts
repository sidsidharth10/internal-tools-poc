/**
 * Deterministic seed. Uses a bare PrismaClient rather than the audited client in
 * src/lib/db.ts, since seeding has no actor and should not produce audit entries.
 */
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

/** Small deterministic PRNG so reviewers see the same dataset every time. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20240517);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function daysAgo(days: number): Date {
  const d = new Date(Date.UTC(2025, 8, 1, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(randomInt(0, 23), randomInt(0, 59), 0, 0);
  return d;
}

const REFUND_COUNT = 5200;
const KYC_COUNT = 80;

const USERS = [
  { email: "ada@examplebank.test", name: "Ada Okafor", role: "admin" },
  { email: "mateo@examplebank.test", name: "Mateo Rivera", role: "ops" },
  { email: "priya@examplebank.test", name: "Priya Nair", role: "ops" },
  { email: "hannah@examplebank.test", name: "Hannah Weiss", role: "compliance" },
  { email: "jonas@examplebank.test", name: "Jonas Lindqvist", role: "compliance" },
];

const FLAG_DEFS = [
  ["instant_payouts", "Instant payouts", "Route eligible payouts through the instant rails provider."],
  ["new_onboarding_flow", "New onboarding flow", "Serve the redesigned three-step onboarding journey."],
  ["refund_auto_approval", "Refund auto-approval", "Auto-approve refunds under $25 with no manual review."],
  ["card_controls_v2", "Card controls v2", "Granular merchant-category card controls in the mobile app."],
  ["risk_scoring_v3", "Risk scoring v3", "Use the v3 model for transaction risk scoring."],
  ["statement_pdf_redesign", "Statement PDF redesign", "New statement layout with per-category spend summary."],
  ["kyc_document_ocr", "KYC document OCR", "Pre-fill KYC review fields from document OCR output."],
  ["dispute_self_service", "Dispute self-service", "Let customers raise disputes without contacting support."],
  ["ledger_read_replica", "Ledger read replica", "Serve ledger reads from the replica cluster."],
  ["fx_live_rates", "FX live rates", "Quote live FX rates instead of hourly snapshots."],
  ["merchant_portal_beta", "Merchant portal beta", "Expose the merchant portal beta to allow-listed accounts."],
  ["push_notifications", "Push notifications", "Send transaction push notifications from the new service."],
  ["sca_step_up", "SCA step-up", "Apply strong customer authentication step-up on high-risk payments."],
  ["batch_settlement", "Batch settlement", "Settle card transactions in hourly batches."],
  ["support_copilot", "Support copilot", "Suggested replies for support agents in the admin console."],
  ["fee_transparency_ui", "Fee transparency UI", "Show fee breakdown before payment confirmation."],
  ["legacy_csv_export", "Legacy CSV export", "Keep the pre-2024 CSV export format available."],
  ["webhook_retry_backoff", "Webhook retry backoff", "Exponential backoff for failed merchant webhooks."],
] as const;

const ENVIRONMENTS = ["dev", "staging", "prod"] as const;
const REFUND_REASONS = [
  "Duplicate charge",
  "Merchant did not deliver",
  "Subscription cancelled",
  "Fraudulent transaction",
  "Incorrect amount charged",
  "Service not as described",
  "Goodwill gesture",
  "Failed ATM withdrawal",
  "Currency conversion error",
  "Chargeback reversal",
] as const;
const REFUND_STATUSES = ["pending", "approved", "denied"] as const;
const KYC_STATUSES = ["pending", "under_review", "approved", "rejected"] as const;
const COUNTRIES = ["GB", "US", "DE", "NG", "IN", "BR", "SG", "AE"] as const;
const DOCUMENT_TYPES = ["passport", "national_id", "drivers_licence"] as const;
const FIRST_NAMES = [
  "Amara", "Liam", "Sofia", "Chen", "Noor", "Diego", "Elif", "Kwame", "Yuki", "Ingrid",
  "Tomas", "Aisha", "Rafael", "Mei", "Oskar", "Zara", "Andre", "Leila", "Ravi", "Marta",
] as const;
const LAST_NAMES = [
  "Ibrahim", "Novak", "Costa", "Zhang", "Haddad", "Fernandez", "Yilmaz", "Mensah", "Tanaka", "Larsen",
  "Silva", "Khan", "Moreau", "Wu", "Kowalski", "Ahmed", "Rossi", "Farah", "Patel", "Nowak",
] as const;
const RISK_NOTES = [
  "Address mismatch against credit bureau record.",
  "Document expiry within 90 days.",
  "Source of funds declared as salaried employment.",
  "PEP screening returned no match.",
  "Selfie liveness check passed on second attempt.",
  "Adverse media screening returned a low-confidence match.",
] as const;

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.kycApplicant.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all(
    USERS.map((user) => prisma.user.create({ data: user })),
  );
  const admin = users.find((u) => u.role === "admin")!;
  const opsUsers = users.filter((u) => u.role === "ops");
  const complianceUsers = users.filter((u) => u.role === "compliance");

  const flags = FLAG_DEFS.flatMap(([key, name, description]) =>
    ENVIRONMENTS.map((environment) => ({
      key,
      name,
      description,
      environment,
      enabled: environment === "prod" ? rand() < 0.45 : rand() < 0.75,
      updatedById: admin.id,
      updatedByName: admin.name,
      updatedAt: daysAgo(randomInt(0, 60)),
    })),
  );
  await prisma.featureFlag.createMany({ data: flags });

  const refunds = Array.from({ length: REFUND_COUNT }, () => {
    const status = rand() < 0.42 ? "pending" : pick(REFUND_STATUSES.slice(1));
    const requestedAt = daysAgo(randomInt(0, 365));
    const decider = rand() < 0.5 ? admin : pick(opsUsers);
    const decided = status !== "pending";
    // Long tail of small refunds with occasional large ones, like real volumes.
    const amountCents =
      rand() < 0.8 ? randomInt(500, 49_900) : randomInt(50_000, 950_000);

    return {
      customerRef: `CUS-${randomInt(100_000, 999_999)}`,
      amountCents,
      reason: pick(REFUND_REASONS),
      status,
      requestedAt,
      decidedById: decided ? decider.id : null,
      decidedByName: decided ? decider.name : null,
      decidedAt: decided
        ? new Date(requestedAt.getTime() + randomInt(1, 96) * 3_600_000)
        : null,
    };
  });

  for (let i = 0; i < refunds.length; i += 500) {
    await prisma.refundRequest.createMany({ data: refunds.slice(i, i + 500) });
  }

  const applicants = Array.from({ length: KYC_COUNT }, () => {
    const status = pick(KYC_STATUSES);
    const submittedAt = daysAgo(randomInt(0, 120));
    const reviewer = pick(complianceUsers);
    const reviewed = status === "approved" || status === "rejected";

    return {
      fullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      status,
      submittedAt,
      dateOfBirth: new Date(
        Date.UTC(randomInt(1955, 2004), randomInt(0, 11), randomInt(1, 28)),
      ),
      country: pick(COUNTRIES),
      documentType: pick(DOCUMENT_TYPES),
      documentRef: `DOC-${randomInt(1_000_000, 9_999_999)}`,
      riskNotes: pick(RISK_NOTES),
      reviewedById: reviewed ? reviewer.id : null,
      reviewedByName: reviewed ? reviewer.name : null,
      reviewedAt: reviewed
        ? new Date(submittedAt.getTime() + randomInt(4, 240) * 3_600_000)
        : null,
    };
  });
  await prisma.kycApplicant.createMany({ data: applicants });

  console.log(
    `Seeded ${users.length} users, ${flags.length} feature flags, ` +
      `${refunds.length} refund requests, ${applicants.length} KYC applicants.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
