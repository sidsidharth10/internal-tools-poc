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
      <span className="whitespace-nowrap text-sm text-slate-600">
        {new Date(row.createdAt).toLocaleString()}
      </span>
    ),
  },
  {
    key: "actor",
    header: "Actor",
    render: (row) => (
      <span className="text-sm">
        {row.actor.name}{" "}
        <span className="text-slate-500">({row.actor.role})</span>
      </span>
    ),
  },
  {
    key: "action",
    header: "Action",
    render: (row) => <span className="font-mono text-xs">{row.action}</span>,
  },
  {
    key: "entity",
    header: "Entity",
    render: (row) => (
      <span className="text-sm">
        <Badge>{row.entityType}</Badge>{" "}
        <span className="font-mono text-xs text-slate-500">{row.entityId}</span>
      </span>
    ),
  },
  {
    key: "changes",
    header: "Changes",
    render: (row) => {
      const changes = diffSnapshots(row.before, row.after);
      if (changes.length === 0) {
        return <span className="text-xs text-slate-500">—</span>;
      }
      return (
        <ul className="space-y-0.5 text-xs text-slate-600">
          {changes.slice(0, 4).map((change) => (
            <li key={change.field}>
              <span className="font-medium">{change.field}</span>:{" "}
              {JSON.stringify(change.from) ?? "—"} →{" "}
              {JSON.stringify(change.to) ?? "—"}
            </li>
          ))}
          {changes.length > 4 ? (
            <li className="text-slate-400">+{changes.length - 4} more</li>
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
