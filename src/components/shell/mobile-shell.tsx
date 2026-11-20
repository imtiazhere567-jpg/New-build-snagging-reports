"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { DemoControls } from "./demo-controls";
import { AccountMenu } from "./account-menu";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toast";

export interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  primary?: boolean;
}

/**
 * Phone-first shell used by the home owner and team members.
 * On a desktop it is shown as a centred phone-width column so the portfolio demo still reads as a mobile app.
 */
export function MobileShell({ user, tabs, children }: { user: User; tabs: TabItem[]; children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-dvh bg-[#e9e7e1] sm:py-6">
      <div className="relative mx-auto flex min-h-dvh max-w-[440px] flex-col bg-canvas sm:min-h-[calc(100dvh-3rem)] sm:overflow-hidden sm:rounded-[28px] sm:shadow-lift sm:ring-1 sm:ring-line">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line/70 bg-canvas/90 px-4 backdrop-blur-md">
          <Logo />
          <DemoControls className="ml-auto" />
          <div className="ml-1"><AccountMenu user={user} variant="avatar" /></div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-8">{children}</main>
        <Toaster />

        <nav className="sticky bottom-0 z-30 w-full border-t border-line bg-surface/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 backdrop-blur-md">
          <ul className="flex items-end justify-around">
            {tabs.map((t) => {
              const active = t.exact ? path === t.href : path.startsWith(t.href);
              const Icon = t.icon;
              if (t.primary) {
                return (
                  <li key={t.href} className="-mt-6">
                    <Link
                      href={t.href}
                      className="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lift ring-4 ring-canvas transition-transform active:scale-95"
                      aria-label={t.label}
                    >
                      <Icon className="size-6" />
                    </Link>
                  </li>
                );
              }
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    className={cn(
                      "flex w-16 flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] font-medium transition-colors",
                      active ? "text-brand-700" : "text-faint hover:text-ink-2",
                    )}
                  >
                    <Icon className="size-[21px]" strokeWidth={active ? 2.2 : 1.8} />
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
