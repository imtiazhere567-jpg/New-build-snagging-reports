"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo, LogoMark } from "@/components/ui/logo";
import { InboxView } from "@/components/inbox-view";
import { useStore } from "@/lib/data/store";
import { useHydrated } from "@/lib/data/use-hydrated";

const HOME = { contractor: "/contractor", team: "/team", owner: "/owner" } as const;

/** Standalone demo inbox (used by home owners, team members and signed-out visitors). */
export default function InboxPage() {
  const ready = useHydrated();
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId));

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LogoMark className="size-10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur-md sm:px-6">
        <Link href={me ? HOME[me.role] : "/login"} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-ink-2 hover:bg-sunken">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <Logo className="ml-1" />
        <span className="ml-auto rounded-full bg-brand-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-brand-700">Demo inbox</span>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <InboxView />
      </div>
    </div>
  );
}
