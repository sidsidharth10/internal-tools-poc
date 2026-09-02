"use client";

import { DataTable, type Column } from "@/components/data-table";
import { diffSnapshots } from "@/components/audit-trail";
import { Badge } from "@/components/ui";
import { ENTITY_TYPES } from "@/lib/domain";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: string | null;
  after: string | null;
  createdAt: string;
  actor: { name: string; role: string };
};

const columns: Column<AuditRow>[] = [
  {
    key: "createdAt",
    header: "When",
    sortable: true,
    render: (row) => (
      <span className="tabular whitespace-nowrap text-ink-soft">
        {new Date(row.createdAt).toLocaleString()}
      </span>
    ),
  },
  {
    key: "actor",
    header: "Actor",
    render: (row) => (
      <span className="whitespace-nowrap">
        <span className="text-ink">{row.actor.name}</span>{" "}
        <span className="text-ink-muted">({row.actor.role})</span>
      </span>
    ),
  },
  {
    key: "action",
    header: "Action",
    render: (row) => (
      <span className="font-mono text-xs text-ink">{row.action}</span>
    ),
  },
  {
    key: "entity",
    header: "Entity",
    render: (row) => (
      <span className="flex flex-col gap-1">
        <Badge>{row.entityType}</Badge>
        <span className="font-mono text-[0.7rem] text-ink-muted">
          {row.entityId}
        </span>
      </span>
    ),
  },
  {
    key: "changes",
    header: "Changes",
    render: (row) => {
      const changes = diffSnapshots(row.before, row.after);
      if (changes.length === 0) {
        return <span className="text-xs text-ink-muted">—</span>;
      }
      return (
        <ul className="space-y-0.5 text-xs text-ink-soft">
          {changes.slice(0, 4).map((change) => (
            <li key={change.field}>
              <span className="font-medium text-ink">{change.field}</span>{" "}
              <span className="text-ink-muted line-through">
                {JSON.stringify(change.from) ?? "—"}
              </span>{" "}
              → {JSON.stringify(change.to) ?? "—"}
            </li>
          ))}
          {changes.length > 4 ? (
            <li className="text-ink-muted">+{changes.length - 4} more</li>
          ) : null}
        </ul>
      );
    },
  },
];

export function AuditTable() {
  return (
    <DataTable
      endpoint="/api/audit-logs"
      rowKey={(row) => row.id}
      columns={columns}
      emptyMessage="No changes recorded yet. Toggle a feature flag to create one."
      filters={[
        {
          type: "search",
          key: "search",
          placeholder: "Action, entity id or actor",
        },
        {
          type: "select",
          key: "entityType",
          label: "Entity type",
          options: ENTITY_TYPES.map((type) => ({ value: type, label: type })),
        },
      ]}
    />
  );
}
