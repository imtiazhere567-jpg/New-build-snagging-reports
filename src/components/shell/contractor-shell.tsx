"use client";

import { isDemo } from "@/lib/config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  ClipboardList,
  FileText,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  PoundSterling,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { DemoControls } from "./demo-controls";
import { AccountMenu } from "./account-menu";
import { useStore } from "@/lib/data/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toast";

const NAV = [
  { href: "/contractor", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/contractor/reports", label: "Reports", icon: FileText, badge: "reports" as "reports" | "inbox" },
  { href: "/contractor/snags", label: "Snag board", icon: KanbanSquare },
  { href: "/contractor/properties", label: "Owners & homes", icon: Building2 },
  { href: "/contractor/team", label: "Team", icon: Users },
  { href: "/contractor/billing", label: "Quotes & invoices", icon: PoundSterling },
  { href: "/contractor/rate-card", label: "Rate card", icon: ClipboardList },
  { href: "/contractor/inbox", label: isDemo ? "Demo inbox" : "Inbox", icon: Inbox, badge: "inbox" as const },
  { href: "/contractor/settings", label: "Settings", icon: Settings },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const newReports = useStore((s) => s.reports.filter((r) => r.status === "submitted").length);
  const unreadEmails = useStore((s) => s.emails.filter((e) => !e.read).length);
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.exact ? path === item.href : path.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors",
              active ? "bg-white/[0.09] text-white" : "text-white/55 hover:bg-white/[0.05] hover:text-white/90",
            )}
          >
            <Icon className={cn("size-[17px]", active ? "text-highlight" : "text-white/40 group-hover:text-white/70")} />
            <span className="flex-1">{item.label}</span>
            {item.badge === "reports" && newReports > 0 && (
              <span className="rounded-full bg-highlight px-1.5 text-[11px] font-bold text-night tabular">{newReports}</span>
            )}
            {item.badge === "inbox" && unreadEmails > 0 && (
              <span className="rounded-full bg-white/15 px-1.5 text-[11px] font-bold text-white tabular">{unreadEmails}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function ContractorShell({ user, children }: { user: User; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const company = useStore((s) => s.settings.name);

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col bg-night bg-blueprint-dark px-3 py-4">
      <div className="flex items-center justify-between px-2 pb-6">
        <Logo inverted />
      </div>
      <div className="mx-2 mb-4 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.06]">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">Contractor</p>
        <p className="truncate text-[13px] font-medium text-white/85">{company}</p>
      </div>
      <NavList onNavigate={onNavigate} />
      <div className="mt-auto pt-4">
        <AccountMenu user={user} variant="sidebar" />
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar()}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-up">
            {sidebar(() => setOpen(false))}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 rounded-lg p-1.5 text-white/60 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
        <button onClick={() => setOpen(true)} className="-ml-1 rounded-lg p-1.5 text-ink-2 hover:bg-sunken lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <div className="lg:hidden">
          <Logo />
        </div>
        <DemoControls className="ml-auto" />
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      <Toaster />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
