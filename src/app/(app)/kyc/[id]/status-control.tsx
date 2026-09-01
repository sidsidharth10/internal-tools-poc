"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui";
import { KYC_STATUSES } from "@/lib/domain";

export function StatusControl({
  id,
  current,
}: {
  id: string;
  current: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    setError(null);
    const response = await fetch(`/api/kyc/${id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? `Request failed (${response.status})`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Status"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {KYC_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <Button onClick={save} disabled={submitting || status === current}>
          {submitting ? "Saving…" : "Update status"}
        </Button>
      </div>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
