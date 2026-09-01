"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card } from "@/components/ui";

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
      <Card className="p-4 text-sm text-slate-700">
        No users found. Run <code className="font-mono">npm run setup</code> to
        create the database and seed data.
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <label className="block text-sm font-medium text-slate-700">
        Sign in as
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} — {user.roleLabel} ({user.email})
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Button onClick={signIn} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </Card>
  );
}
