import { Card } from "./ui";

type Entry = {
  id: string;
  action: string;
  before: string | null;
  after: string | null;
  createdAt: Date;
  actor: { name: string; role: string };
};

/** Diffs the JSON snapshots stored on an audit row into changed field pairs. */
export function diffSnapshots(
  before: string | null,
  after: string | null,
): { field: string; from: unknown; to: unknown }[] {
  const parse = (value: string | null): Record<string, unknown> => {
    if (!value) return {};
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  };

  const from = parse(before);
  const to = parse(after);
  const fields = new Set([...Object.keys(from), ...Object.keys(to)]);

  return [...fields]
    .filter((field) => JSON.stringify(from[field]) !== JSON.stringify(to[field]))
    .map((field) => ({ field, from: from[field], to: to[field] }));
}

function display(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function AuditTrail({ entries }: { entries: Entry[] }) {
  return (
    <Card className="p-4">
      <h2 className="font-semibold text-slate-900">Audit trail</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No changes recorded yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {entries.map((entry) => {
            const changes = diffSnapshots(entry.before, entry.after);
            return (
              <li key={entry.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-sm text-slate-900">
                  <span className="font-mono">{entry.action}</span> by{" "}
                  {entry.actor.name} ({entry.actor.role}) ·{" "}
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
                {changes.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                    {changes.map((change) => (
                      <li key={change.field}>
                        <span className="font-medium">{change.field}</span>:{" "}
                        {display(change.from)} → {display(change.to)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
