import Link from "next/link";

import { ROLE_LABELS } from "@/lib/domain";
import { can, type ActorContext } from "@/lib/policy";

import { SignOutButton } from "./sign-out-button";

const APPS = [
  { href: "/flags", label: "Feature Flags" },
  { href: "/refunds", label: "Refunds" },
  { href: "/kyc", label: "KYC Review" },
] as const;

export function NavShell({
  actor,
  children,
}: {
  actor: ActorContext;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            Internal Tools
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {APPS.map((app) => (
              <Link
                key={app.href}
                href={app.href}
                className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {app.label}
              </Link>
            ))}
            {can(actor, "audit.read") ? (
              <Link
                href="/audit"
                className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Audit Log
              </Link>
            ) : null}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {actor.name}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {ROLE_LABELS[actor.role]}
              </span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
