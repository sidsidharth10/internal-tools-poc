import { OPS_REFUND_LIMIT_CENTS, type Role } from "@/lib/domain";

export type ActorContext = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/**
 * Every capability in the system. Adding a capability without adding it to
 * ROLE_PERMISSIONS below means nobody can perform it — the model is deny-by-default.
 */
export const PERMISSIONS = [
  "flags.read",
  "flags.write",
  "flags.delete",
  "refunds.read",
  "refunds.decide.limited",
  "refunds.decide.any",
  "kyc.read.full",
  "kyc.read.redacted",
  "kyc.decide",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    "flags.read",
    "flags.write",
    "flags.delete",
    "refunds.read",
    "refunds.decide.any",
    "kyc.read.full",
    "kyc.decide",
    "audit.read",
  ],
  ops: [
    "flags.read",
    "flags.write",
    "refunds.read",
    "refunds.decide.limited",
    "kyc.read.redacted",
  ],
  compliance: ["flags.read", "refunds.read", "kyc.read.full", "kyc.decide"],
};

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends Error {
  readonly status = 401;
  constructor(message = "Not signed in") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export function can(actor: ActorContext, permission: Permission): boolean {
  return ROLE_PERMISSIONS[actor.role].includes(permission);
}

export function requirePermission(
  actor: ActorContext,
  permission: Permission,
): void {
  if (!can(actor, permission)) {
    throw new ForbiddenError(
      `Role "${actor.role}" is not permitted to ${permission}`,
    );
  }
}

/**
 * Refund decisions are value-gated as well as role-gated: `ops` may only decide
 * refunds below OPS_REFUND_LIMIT_CENTS, `admin` may decide any amount, and
 * `compliance` may not decide at all.
 */
export function assertCanDecideRefund(
  actor: ActorContext,
  amountCents: number,
): void {
  if (can(actor, "refunds.decide.any")) return;

  if (!can(actor, "refunds.decide.limited")) {
    throw new ForbiddenError(
      `Role "${actor.role}" has read-only access to refunds`,
    );
  }

  if (amountCents >= OPS_REFUND_LIMIT_CENTS) {
    throw new ForbiddenError(
      `Role "${actor.role}" may only decide refunds under ${
        OPS_REFUND_LIMIT_CENTS / 100
      } USD; this request is for ${amountCents / 100} USD`,
    );
  }
}
