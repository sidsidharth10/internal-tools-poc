"use client";

import Link from "next/link";
import { useState } from "react";

import { DataTable, type Column } from "@/components/data-table";
import { Badge, Button } from "@/components/ui";
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
          className="font-mono text-sm text-slate-900 underline-offset-2 hover:underline"
        >
          {row.key}
        </Link>
      ),
    },
    { key: "name", header: "Name", sortable: true, render: (row) => row.name },
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
        <span className="text-sm text-slate-600">
          {new Date(row.updatedAt).toLocaleString()}
          {row.updatedByName ? ` · ${row.updatedByName}` : ""}
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
            <Button variant="secondary">Edit</Button>
          </Link>
          {canDelete ? (
            <Button
              variant="danger"
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
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
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
