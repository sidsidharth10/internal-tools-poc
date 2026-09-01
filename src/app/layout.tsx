import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Internal Tools POC",
  description:
    "Role-scoped internal tooling proof-of-concept: feature flags, refunds and KYC review.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
