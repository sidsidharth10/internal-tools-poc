"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  FlagIcon,
  HomeIcon,
  LedgerIcon,
  RefundIcon,
  ShieldIcon,
} from "./nav-icons";

const ICONS = {
  home: HomeIcon,
  flags: FlagIcon,
  refunds: RefundIcon,
  kyc: ShieldIcon,
  audit: LedgerIcon,
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-brand-50 font-medium text-brand-700"
                : "text-ink-soft hover:bg-canvas hover:text-ink"
            }`}
          >
            <Icon className={active ? "text-brand-600" : "text-ink-muted"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Same items, laid out horizontally for viewports without room for the rail. */
export function CompactNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex items-center gap-1 overflow-x-auto px-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
              active
                ? "bg-brand-50 font-medium text-brand-700"
                : "text-ink-soft hover:bg-canvas hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
