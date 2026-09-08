import Link from "next/link";

import { ROLE_LABELS } from "@/lib/domain";
import { can, type ActorContext } from "@/lib/policy";

import { CompactNav, SidebarNav, type NavItem } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

const BASE_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: "home" },
  { href: "/flags", label: "Feature Flags", icon: "flags" },
  { href: "/refunds", label: "Refunds", icon: "refunds" },
  { href: "/kyc", label: "KYC Review", icon: "kyc" },
];

const ROLE_TONES: Record<string, string> = {
  admin: "bg-brand-50 text-brand-700 border-brand-200/70",
  ops: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  compliance: "bg-amber-50 text-amber-800 border-amber-200/70",
};

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-xs">
        IT
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-ink">
          Internal Tools
        </span>
        <span className="block text-xs text-ink-muted">Role-scoped POC</span>
      </span>
    </Link>
  );
}

function ActorChip({ actor }: { actor: ActorContext }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-canvas text-xs font-semibold text-ink-soft">
        {initials(actor.name)}
      </span>
      <span className="hidden leading-tight sm:block">
        <span className="block text-sm font-medium text-ink">{actor.name}</span>
        <span
          className={`mt-0.5 inline-flex rounded-full border px-1.5 text-[0.68rem] font-medium ${
            ROLE_TONES[actor.role] ?? ROLE_TONES.ops
          }`}
        >
          {ROLE_LABELS[actor.role]}
        </span>
      </span>
    </div>
  );
}

export function NavShell({
  actor,
  children,
}: {
  actor: ActorContext;
  children: React.ReactNode;
}) {
  const items: NavItem[] = can(actor, "audit.read")
    ? [...BASE_ITEMS, { href: "/audit", label: "Audit Log", icon: "audit" }]
    : BASE_ITEMS;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Brand />
        <div className="mt-7">
          <p className="px-3 pb-2 text-[0.68rem] font-semibold tracking-[0.09em] text-ink-muted uppercase">
            Applications
          </p>
          <SidebarNav items={items} />
        </div>
        <div className="mt-auto rounded-card border border-line bg-canvas p-3 text-xs leading-5 text-ink-muted">
          Roles resolve from the database on every request; the navigation only
          reflects what the API would already allow.
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3 sm:px-8">
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden min-w-0 flex-1 lg:block" />
            <div className="ml-auto flex items-center gap-3">
              <ActorChip actor={actor} />
              <SignOutButton />
            </div>
          </div>
          <div className="border-t border-line px-5 py-2 lg:hidden">
            <CompactNav items={items} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
