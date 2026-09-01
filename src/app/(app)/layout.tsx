import { redirect } from "next/navigation";

import { NavShell } from "@/components/nav-shell";
import { getActor } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");

  return <NavShell actor={actor}>{children}</NavShell>;
}
