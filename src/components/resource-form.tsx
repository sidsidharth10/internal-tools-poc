"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "./ui";

export type FieldDef =
  | {
      type: "text" | "textarea";
      name: string;
      label: string;
      placeholder?: string;
      help?: string;
      disabled?: boolean;
    }
  | {
      type: "select";
      name: string;
      label: string;
      options: { value: string; label: string }[];
      help?: string;
      disabled?: boolean;
    }
  | { type: "checkbox"; name: string; label: string; help?: string; disabled?: boolean };

export type FormValues = Record<string, string | boolean>;

/**
 * Shared create/edit form. It posts JSON to an API route and surfaces whatever the
 * route returns, so a 403 from the policy layer is shown to the user verbatim.
 */
export function ResourceForm({
  fields,
  initialValues,
  endpoint,
  method,
  submitLabel,
  redirectTo,
  secondaryAction,
}: {
  fields: FieldDef[];
  initialValues: FormValues;
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo?: string;
  secondaryAction?: React.ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setError(
        body.issues
          ? body.issues
              .map(
                (issue: { path: string[]; message: string }) =>
                  `${issue.path.join(".")}: ${issue.message}`,
              )
              .join(", ")
          : (body.error ?? `Request failed (${response.status})`),
      );
      return;
    }

    setSaved(true);
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-brand-500 disabled:bg-surface-muted disabled:text-ink-muted";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {fields.map((field) => (
        <div
          key={field.name}
          className={
            field.type === "checkbox"
              ? "flex items-start gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2.5"
              : "space-y-1.5"
          }
        >
          {field.type === "checkbox" ? null : (
            <label
              htmlFor={field.name}
              className="block text-sm font-medium text-ink"
            >
              {field.label}
            </label>
          )}

          {field.type === "textarea" ? (
            <textarea
              id={field.name}
              name={field.name}
              rows={3}
              disabled={field.disabled}
              className={inputClass}
              placeholder={field.placeholder}
              value={String(values[field.name] ?? "")}
              onChange={(e) =>
                setValues((v) => ({ ...v, [field.name]: e.target.value }))
              }
            />
          ) : null}

          {field.type === "text" ? (
            <input
              id={field.name}
              name={field.name}
              disabled={field.disabled}
              className={inputClass}
              placeholder={field.placeholder}
              value={String(values[field.name] ?? "")}
              onChange={(e) =>
                setValues((v) => ({ ...v, [field.name]: e.target.value }))
              }
            />
          ) : null}

          {field.type === "select" ? (
            <select
              id={field.name}
              name={field.name}
              disabled={field.disabled}
              className={inputClass}
              value={String(values[field.name] ?? "")}
              onChange={(e) =>
                setValues((v) => ({ ...v, [field.name]: e.target.value }))
              }
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}

          {field.type === "checkbox" ? (
            <>
              <input
                id={field.name}
                name={field.name}
                type="checkbox"
                disabled={field.disabled}
                className="mt-0.5 h-4 w-4 rounded border-line-strong accent-brand-600"
                checked={Boolean(values[field.name])}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.name]: e.target.checked }))
                }
              />
              <label
                htmlFor={field.name}
                className="text-sm font-medium text-ink"
              >
                {field.label}
                {field.help ? (
                  <span className="mt-0.5 block text-xs font-normal text-ink-muted">
                    {field.help}
                  </span>
                ) : null}
              </label>
            </>
          ) : null}

          {field.help && field.type !== "checkbox" ? (
            <p className="text-xs text-ink-muted">{field.help}</p>
          ) : null}
        </div>
      ))}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {saved && !redirectTo ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </p>
      ) : null}

      <div className="flex gap-2 border-t border-line pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
        {secondaryAction}
      </div>
    </form>
  );
}
