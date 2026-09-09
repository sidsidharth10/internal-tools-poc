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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_15%_-10%,var(--color-brand-50),transparent_60%),radial-gradient(50rem_30rem_at_110%_10%,#e6f4ff,transparent_55%)]"
      />

      <div className="relative grid w-full max-w-4xl items-center gap-10 md:grid-cols-[1fr_22rem]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-xs">
              IT
            </span>
            <span className="text-sm font-semibold text-ink">
              Internal Tools
            </span>
          </div>
          <h1 className="mt-6 text-3xl leading-10 font-semibold text-ink">
            Sign in to Internal Tools
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-ink-soft">
            Feature flags, refunds and KYC review. What you can see and do
            depends on your role.
          </p>
        </div>

        <LoginForm users={users} />
      </div>
    </div>
  );
}
