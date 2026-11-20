"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/data/store";
import { useHydrated } from "@/lib/data/use-hydrated";
import type { Role, User } from "@/lib/types";
import { LogoMark } from "@/components/ui/logo";

/** Waits for the demo store, then makes sure the signed-in user has the right role. */
export function RoleGate({ role, children }: { role: Role; children: (user: User) => React.ReactNode }) {
  const ready = useHydrated();
  const router = useRouter();
  const user = useStore((s) => s.users.find((u) => u.id === s.currentUserId));

  useEffect(() => {
    if (ready && (!user || user.role !== role)) router.replace("/login");
  }, [ready, user, role, router]);

  if (!ready || !user || user.role !== role) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LogoMark className="size-10 animate-pulse" />
      </div>
    );
  }
  return <>{children(user)}</>;
}
