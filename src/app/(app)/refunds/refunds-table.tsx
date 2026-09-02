"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DataTable, type Column } from "@/components/data-table";
import {
  Badge,
  Button,
  ErrorBanner,
  Stat,
  type BadgeTone,
} from "@/components/ui";
import {
  OPS_REFUND_LIMIT_CENTS,
  REFUND_STATUSES,
  formatCents,
} from "@/lib/domain";

type RefundRow = {
  id: string;
  customerRef: string;
  amountCents: number;
  reason: string;
  status: string;
  requestedAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
};

type Summary = {
  total: number;
  byStatus: Record<string, number>;
  pendingValueCents: number;
};

const STATUS_TONES: Record<string, BadgeTone> = {
  pending: "amber",
  approved: "green",
  denied: "red",
};

export function RefundsTable({
  canDecideAny,
  canDecideLimited,
}: {
  canDecideAny: boolean;
  canDecideLimited: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [decisions, setDecisions] = useState(0);

  /**
   * Mirrors the server rule so the button state matches, but the button is never
   * the enforcement: the same check runs again in decideRefund() before the write.
   */
  function decidableLocally(amountCents: number): boolean {
    if (canDecideAny) return true;
    return canDecideLimited && amountCents < OPS_REFUND_LIMIT_CENTS;
  }

  async function decide(
    row: RefundRow,
    decision: "approved" | "denied",
    reload: () => void,
  ): Promise<void> {
    setError(null);
    setPending(row.id);
    try {
      const response = await fetch(`/api/refunds/${row.id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(
          `${response.status} from /api/refunds/${row.id}/decision — ${
            body.error ?? "Request failed"
          }`,
        );
        return;
      }
      reload();
      setDecisions((n) => n + 1);
    } finally {
      setPending(null);
    }
  }

  const columns: Column<RefundRow>[] = [
    {
      key: "customerRef",
      header: "Customer",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-[0.8rem] text-ink">
          {row.customerRef}
        </span>
      ),
    },
    {
      key: "amountCents",
      header: "Amount",
      sortable: true,
      align: "right",
      render: (row) => (
        <span
          className={`tabular ${
            row.amountCents >= OPS_REFUND_LIMIT_CENTS
              ? "font-semibold text-ink"
              : "text-ink-soft"
          }`}
        >
          {formatCents(row.amountCents)}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => <span className="text-ink-soft">{row.reason}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge tone={STATUS_TONES[row.status] ?? "neutral"} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "requestedAt",
      header: "Requested",
      sortable: true,
      render: (row) => (
        <span className="tabular text-ink-soft">
          {new Date(row.requestedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "decision",
      header: "Decision",
      align: "right",
      render: (row, reload) => {
        if (row.status !== "pending") {
          return (
            <span className="text-xs text-ink-muted">
              {row.decidedByName ?? "—"}
              {row.decidedAt
                ? ` · ${new Date(row.decidedAt).toLocaleDateString()}`
                : ""}
            </span>
          );
        }

        const readOnly = !canDecideAny && !canDecideLimited;
        // Over-limit rows stay clickable on purpose: the demo needs the server to
        // be the thing that refuses, with its own message.
        const overLimit = !readOnly && !decidableLocally(row.amountCents);
        const title = readOnly
          ? "Your role has read-only access to refunds"
          : overLimit
            ? `Over the ${formatCents(OPS_REFUND_LIMIT_CENTS)} limit for your role — the API will refuse this`
            : undefined;
        const disabled = readOnly || pending === row.id;

        return (
          <div className="flex items-center justify-end gap-2">
            {overLimit ? <Badge tone="amber">over limit</Badge> : null}
            <Button
              size="sm"
              disabled={disabled}
              title={title}
              onClick={() => decide(row, "approved", reload)}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={disabled}
              title={title}
              onClick={() => decide(row, "denied", reload)}
            >
              Deny
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      <SummaryTiles refreshKey={decisions} />
      <DataTable
        endpoint="/api/refunds"
        rowKey={(row) => row.id}
        defaultSort={{ key: "requestedAt", dir: "desc" }}
        columns={columns}
        filters={[
          { type: "search", key: "search", placeholder: "Customer reference" },
          {
            type: "select",
            key: "status",
            label: "Status",
            options: REFUND_STATUSES.map((status) => ({
              value: status,
              label: status,
            })),
          },
          { type: "number", key: "minAmount", label: "Min $", placeholder: "0" },
          {
            type: "number",
            key: "maxAmount",
            label: "Max $",
            placeholder: "10000",
          },
          { type: "date", key: "from", label: "From" },
          { type: "date", key: "to", label: "To" },
        ]}
      />
    </div>
  );
}

/** Counts for the current filter, aggregated by SQL `GROUP BY`, not in the browser. */
function SummaryTiles({ refreshKey }: { refreshKey: number }) {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/refunds/summary?${queryString}`, {
      headers: { accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: Summary | null) => {
        if (!cancelled) setSummary(body);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString, refreshKey]);

  if (!summary) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Matching"
        value={summary.total.toLocaleString()}
        hint="Counted by SQL for the current filter"
      />
      <Stat
        label="Pending"
        tone="amber"
        value={summary.byStatus.pending?.toLocaleString() ?? "0"}
        hint={`${formatCents(summary.pendingValueCents)} awaiting a decision`}
      />
      <Stat
        label="Approved"
        tone="green"
        value={summary.byStatus.approved?.toLocaleString() ?? "0"}
      />
      <Stat
        label="Denied"
        tone="red"
        value={summary.byStatus.denied?.toLocaleString() ?? "0"}
      />
    </div>
  );
}
