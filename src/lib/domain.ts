import { z } from "zod";

export const ROLES = ["ops", "compliance", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const roleSchema = z.enum(ROLES);

export const ROLE_LABELS: Record<Role, string> = {
  ops: "Operations",
  compliance: "Compliance",
  admin: "Administrator",
};

export const ENVIRONMENTS = ["dev", "staging", "prod"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];
export const environmentSchema = z.enum(ENVIRONMENTS);

export const REFUND_STATUSES = ["pending", "approved", "denied"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];
export const refundStatusSchema = z.enum(REFUND_STATUSES);

export const KYC_STATUSES = [
  "pending",
  "under_review",
  "approved",
  "rejected",
] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];
export const kycStatusSchema = z.enum(KYC_STATUSES);

export const ENTITY_TYPES = [
  "FeatureFlag",
  "RefundRequest",
  "KycApplicant",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Amount, in minor units, at or above which only `admin` may decide a refund. */
export const OPS_REFUND_LIMIT_CENTS = 50_000;

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
