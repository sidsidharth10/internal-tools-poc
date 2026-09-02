"use client";

import Link from "next/link";
import { useState } from "react";

import { DataTable, type Column } from "@/components/data-table";
import { Badge, Button, ErrorBanner } from "@/components/ui";
import { ENVIRONMENTS } from "@/lib/domain";

type FlagRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: string;
  updatedByName: string | null;
  updatedAt: string;
};

const ENV_TONES = {
  dev: "neutral",
  staging: "amber",
  prod: "blue",
} as const;

export function FlagsTable({
  canWrite,
  canDelete,
}: {
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  async function mutate(
    url: string,
    init: RequestInit,
    reload: () => void,
  ): Promise<void> {
    setError(null);
    const response = await fetch(url, init);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? `Request failed (${response.status})`);
      return;
    }
    reload();
  }

  const columns: Column<FlagRow>[] = [
    {
      key: "key",
      header: "Key",
      sortable: true,
      render: (row) => (
        <Link
          href={`/flags/${row.id}`}
          className="font-mono text-[0.8rem] font-medium text-ink underline-offset-2 hover:text-brand-700 hover:underline"
        >
          {row.key}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => <span className="text-ink">{row.name}</span>,
    },
    {
      key: "environment",
      header: "Environment",
      sortable: true,
      render: (row) => (
        <Badge tone={ENV_TONES[row.environment as keyof typeof ENV_TONES]}>
          {row.environment}
        </Badge>
      ),
    },
    {
      key: "enabled",
      header: "Enabled",
      sortable: true,
      render: (row, reload) => (
        <Button
          variant={row.enabled ? "primary" : "secondary"}
          size="sm"
          className="w-12"
          disabled={!canWrite}
          title={canWrite ? undefined : "Your role cannot modify flags"}
          onClick={() =>
            mutate(
              `/api/feature-flags/${row.id}`,
              {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ enabled: !row.enabled }),
              },
              reload,
            )
          }
        >
          {row.enabled ? "On" : "Off"}
        </Button>
      ),
    },
    {
      key: "updatedAt",
      header: "Last modified",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-ink-muted">
          <span className="tabular block text-ink-soft">
            {new Date(row.updatedAt).toLocaleString()}
          </span>
          {row.updatedByName ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row, reload) => (
        <div className="flex justify-end gap-2">
          <Link href={`/flags/${row.id}`}>
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </Link>
          {canDelete ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (!confirm(`Delete flag "${row.key}" (${row.environment})?`))
                  return;
                mutate(
                  `/api/feature-flags/${row.id}`,
                  { method: "DELETE" },
                  reload,
                );
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      <DataTable
        endpoint="/api/feature-flags"
        rowKey={(row) => row.id}
        defaultSort={{ key: "updatedAt", dir: "desc" }}
        columns={columns}
        filters={[
          { type: "search", key: "search", placeholder: "Key, name or description" },
          {
            type: "select",
            key: "environment",
            label: "Environment",
            options: ENVIRONMENTS.map((env) => ({ value: env, label: env })),
          },
          {
            type: "select",
            key: "enabled",
            label: "State",
            options: [
              { value: "true", label: "Enabled" },
              { value: "false", label: "Disabled" },
            ],
          },
        ]}
      />
    </div>
  );
}
