"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "./ui";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/session", { method: "DELETE" });
          router.replace("/login");
          router.refresh();
        });
      }}
    >
      Switch user
    </Button>
  );
}
