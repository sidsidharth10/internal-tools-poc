import { OPS_REFUND_LIMIT_CENTS, formatCents, type Role } from "@/lib/domain";

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

/** Used in the messages callers see, so refusals read as English rather than as permission keys. */
const PERMISSION_LABELS: Record<Permission, string> = {
  "flags.read": "view feature flags",
  "flags.write": "change feature flags",
  "flags.delete": "delete feature flags",
  "refunds.read": "view refunds",
  "refunds.decide.limited": "decide refunds",
  "refunds.decide.any": "decide refunds",
  "kyc.read.full": "view applicant details",
  "kyc.read.redacted": "view the KYC queue",
  "kyc.decide": "change an applicant's status",
  "audit.read": "view the audit log",
};

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

export class ConflictError extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
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
      `You do not have permission to ${PERMISSION_LABELS[permission]}.`,
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
    throw new ForbiddenError("You have read-only access to refunds.");
  }

  if (amountCents >= OPS_REFUND_LIMIT_CENTS) {
    throw new ForbiddenError(
      `This refund is above your ${formatCents(OPS_REFUND_LIMIT_CENTS)} approval limit and needs an admin.`,
    );
  }
}
