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
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-1">
          <label
            htmlFor={field.name}
            className="block text-sm font-medium text-slate-700"
          >
            {field.label}
          </label>

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
            <input
              id={field.name}
              name={field.name}
              type="checkbox"
              disabled={field.disabled}
              className="h-4 w-4 rounded border-slate-300"
              checked={Boolean(values[field.name])}
              onChange={(e) =>
                setValues((v) => ({ ...v, [field.name]: e.target.checked }))
              }
            />
          ) : null}

          {field.help ? (
            <p className="text-xs text-slate-500">{field.help}</p>
          ) : null}
        </div>
      ))}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {saved && !redirectTo ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
        {secondaryAction}
      </div>
    </form>
  );
}
