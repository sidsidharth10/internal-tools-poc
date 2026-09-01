import { redirect } from "next/navigation";

import { listLoginUsers } from "@/lib/data/users";
import { ROLE_LABELS, roleSchema } from "@/lib/domain";
import { getActor } from "@/lib/session";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getActor()) redirect("/");

  const users = (await listLoginUsers()).map((user) => {
    const role = roleSchema.parse(user.role);
    return { ...user, role, roleLabel: ROLE_LABELS[role] };
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">
        Internal Tools POC
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Sign in as one of the seeded service identities. This stands in for a
        real identity provider: the cookie carries only a user id, and the role
        is re-read from the database on every request.
      </p>
      <div className="mt-6">
        <LoginForm users={users} />
      </div>
    </div>
  );
}
