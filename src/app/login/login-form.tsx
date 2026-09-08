"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, Mono } from "@/components/ui";

type LoginUser = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
};

export function LoginForm({ users }: { users: LoginUser[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setPending(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Sign-in failed");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (users.length === 0) {
    return (
      <Card className="p-5 text-sm text-ink-soft">
        No users found. Run <Mono>npm run setup</Mono> to create the database
        and seed data.
      </Card>
    );
  }

  const selected = users.find((user) => user.id === userId);

  return (
    <Card className="p-5 shadow-pop">
      <h2 className="text-sm font-semibold text-ink">Sign in</h2>
      <p className="mt-1 text-sm text-ink-muted">
        No password: this POC simulates a service-principal login.
      </p>

      <label
        htmlFor="userId"
        className="mt-5 block text-xs font-medium tracking-wide text-ink-muted uppercase"
      >
        Identity
      </label>
      <select
        id="userId"
        className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} — {user.roleLabel} ({user.email})
          </option>
        ))}
      </select>
      {selected ? (
        <p className="mt-2 text-xs text-ink-muted">
          Signs in as <span className="text-ink-soft">{selected.email}</span>{" "}
          with the {selected.roleLabel.toLowerCase()} role.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <Button className="mt-5 w-full" onClick={signIn} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </Card>
  );
}
