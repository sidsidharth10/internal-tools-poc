import { Card, CardHeader } from "./ui";

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
    <Card>
      <CardHeader
        title="Audit trail"
        description="Written in the same transaction as the change itself."
      />
      {entries.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">
          No changes recorded yet.
        </p>
      ) : (
        <ol className="px-5 py-4">
          {entries.map((entry) => {
            const changes = diffSnapshots(entry.before, entry.after);
            return (
              <li
                key={entry.id}
                className="relative border-l border-line pb-5 pl-5 last:pb-0"
              >
                <span className="absolute top-1.5 -left-[4.5px] h-2 w-2 rounded-full border-2 border-surface bg-brand-500" />
                <p className="text-sm text-ink">
                  <span className="font-mono text-[0.8rem] font-medium">
                    {entry.action}
                  </span>{" "}
                  <span className="text-ink-soft">
                    by {entry.actor.name} ({entry.actor.role})
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
                {changes.length > 0 ? (
                  <ul className="mt-2 space-y-1 rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs text-ink-soft">
                    {changes.map((change) => (
                      <li key={change.field}>
                        <span className="font-medium text-ink">
                          {change.field}
                        </span>{" "}
                        <span className="text-ink-muted line-through">
                          {display(change.from)}
                        </span>{" "}
                        → <span className="text-ink">{display(change.to)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
