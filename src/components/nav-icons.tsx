type IconProps = { className?: string };

const BASE = "h-4 w-4 shrink-0";

function Svg({
  className = "",
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${BASE} ${className}`}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 21V4" />
      <path d="M5 5h11l-1.8 3.5L16 12H5z" />
    </Svg>
  );
}

export function RefundIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M14.5 9.5A2.5 2.5 0 0 0 12 8c-1.4 0-2.5.8-2.5 2s1.1 1.8 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2a2.5 2.5 0 0 1-2.5-1.5" />
      <path d="M12 6.2v1.6M12 16.2v1.6" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 19 6v5.5c0 4-2.9 7.4-7 8.9-4.1-1.5-7-4.9-7-8.9V6z" />
      <path d="m9.2 12 2 2 3.6-3.7" />
    </Svg>
  );
}

export function LedgerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3.5h10.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z" />
      <path d="M6 3.5v17" />
      <path d="M9.5 8.5h5M9.5 12h5M9.5 15.5h3" />
    </Svg>
  );
}
