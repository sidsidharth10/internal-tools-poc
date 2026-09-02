import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-xs hover:bg-brand-700 active:bg-brand-700",
  secondary:
    "bg-surface text-ink border border-line-strong shadow-xs hover:bg-surface-muted active:bg-canvas",
  danger:
    "bg-surface text-red-700 border border-red-200 shadow-xs hover:bg-red-50 active:bg-red-100",
  ghost: "text-ink-soft hover:bg-canvas hover:text-ink",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-7 gap-1.5 px-2.5 text-xs",
  md: "h-9 gap-2 px-3.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      {...props}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-45 ${BUTTON_SIZES[size]} ${BUTTON_STYLES[variant]} ${className}`}
    />
  );
}

const BADGE_TONES = {
  neutral: "bg-canvas text-ink-soft border-line",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  red: "bg-red-50 text-red-700 border-red-200/70",
  amber: "bg-amber-50 text-amber-800 border-amber-200/70",
  blue: "bg-brand-50 text-brand-700 border-brand-200/70",
} as const;

const DOT_TONES = {
  neutral: "bg-ink-muted",
  green: "bg-emerald-500",
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-brand-500",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  /** Status pills read faster with a colour dot than with colour alone. */
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}
    >
      {dot ? (
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONES[tone]}`} />
      ) : null}
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-line pb-5">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[1.6rem] leading-8 font-semibold text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-surface shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

const CALLOUT_TONES = {
  info: {
    wrap: "border-brand-200/70 bg-brand-50/60 text-brand-900",
    marker: "bg-brand-500",
  },
  warn: {
    wrap: "border-amber-200 bg-amber-50/70 text-amber-900",
    marker: "bg-amber-500",
  },
} as const;

export function Callout({
  title,
  tone = "info",
  children,
}: {
  title: string;
  tone?: keyof typeof CALLOUT_TONES;
  children: ReactNode;
}) {
  const styles = CALLOUT_TONES[tone];
  return (
    <div
      className={`flex gap-3 rounded-card border px-4 py-3 text-sm leading-6 ${styles.wrap}`}
    >
      <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${styles.marker}`} />
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-0.5 space-y-1 opacity-90">{children}</div>
      </div>
    </div>
  );
}

/** Compact metric used above tables to give the dataset a shape at a glance. */
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: BadgeTone;
}) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONES[tone]}`} />
        <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
          {label}
        </p>
      </div>
      <p className="tabular mt-1.5 text-xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[0.78rem] text-ink-soft">
      {children}
    </code>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </div>
  );
}
