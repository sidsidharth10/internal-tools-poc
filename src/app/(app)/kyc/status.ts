import type { BadgeTone } from "@/components/ui";
import type { KycStatus } from "@/lib/domain";

export const STATUS_TONES: Record<KycStatus, BadgeTone> = {
  pending: "neutral",
  under_review: "amber",
  approved: "green",
  rejected: "red",
};
