"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, Check, ChevronRight, Hammer, Hourglass, MapPin, RotateCcw } from "lucide-react";
import { RefTag, SeverityBadge, StatusBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { JobSheet } from "@/components/team/job-sheet";
import { useStore } from "@/lib/data/store";
import { isOverdue } from "@/lib/data/queries";
import { OPEN_WORK, SEVERITIES, TRADE_LABEL } from "@/lib/constants";
import type { Snag } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type Filter = "all" | "todo" | "doing" | "overdue";
const CHIPS: { key: Filter; label: string; match: (s: Snag) => boolean }[] = [
  { key: "all", label: "All open", match: () => true },
  { key: "todo", label: "To start", match: (s) => s.status === "assigned" || s.status === "reopened" },
  { key: "doing", label: "In progress", match: (s) => s.status === "in_progress" },
  { key: "overdue", label: "Overdue", match: (s) => isOverdue(s) },
];

export default function TeamJobs() {
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))!;
  const snags = useStore((s) => s.snags);
  const properties = useStore((s) => s.properties);
  const rooms = useStore((s) => s.rooms);
  const [filter, setFilter] = useState<Filter>("all");
  const [openJob, setOpenJob] = useState<string | null>(null);

  const mine = snags.filter((s) => s.assigneeId === me.id);
  const open = mine
    .filter((s) => OPEN_WORK.includes(s.status))
    // Overdue first, then most serious, then oldest
    .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || a.createdAt.localeCompare(b.createdAt));
  const chip = CHIPS.find((c) => c.key === filter)!;
  const shown = open.filter(chip.match);
  const overdue = open.filter((s) => isOverdue(s)).length;
  const awaiting = mine.filter((s) => s.status === "fixed").length;

  const boxes: { key: string; label: string; value: number; icon: typeof Hammer; active: boolean; onClick?: () => void; href?: string; tone?: "warn" }[] = [
    { key: "all", label: "Open", value: open.length, icon: Hammer, active: filter === "all", onClick: () => setFilter("all") },
    { key: "overdue", label: "Overdue", value: overdue, icon: AlertTriangle, active: filter === "overdue", onClick: () => setFilter(filter === "overdue" ? "all" : "overdue"), tone: overdue ? "warn" : undefined },
    { key: "awaiting", label: "Awaiting check", value: awaiting, icon: Hourglass, active: false, href: "/team/completed" },
  ];

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <p className="text-[13px] text-muted">{TRADE_LABEL[me.trade!]}</p>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Hi {me.name.split(" ")[0]}</h1>
      </div>

      {/* Clickable summary boxes */}
      <div className="grid grid-cols-3 gap-2">
        {boxes.map((b) => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <b.icon className={cn("size-4", b.active ? "text-highlight" : b.tone === "warn" ? "text-sev-major" : "text-faint")} />
                {b.href ? <ArrowRight className="size-3.5 opacity-50" /> : b.active ? <Check className="size-3.5 text-highlight" strokeWidth={3} /> : null}
              </div>
              <p className={cn("mt-2 text-[24px] leading-none font-semibold tabular", !b.active && b.tone === "warn" && "text-sev-major")}>{b.value}</p>
              <p className={cn("mt-1.5 text-[11.5px] leading-tight", b.active ? "text-white/60" : "text-muted")}>{b.label}</p>
            </>
          );
          const cls = cn(
            "rounded-2xl p-3.5 text-left transition-all active:scale-[0.98]",
            b.active ? "bg-night text-white shadow-lift" : "border border-line bg-surface hover:border-line-strong",
          );
          return b.href ? (
            <Link key={b.key} href={b.href} className={cls}>{inner}</Link>
          ) : (
            <button key={b.key} onClick={b.onClick} aria-pressed={b.active} className={cls}>{inner}</button>
          );
        })}
      </div>

      {/* Filter chips */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none" role="tablist">
        {CHIPS.map((c) => {
          const n = open.filter(c.match).length;
          return (
            <button
              key={c.key}
              role="tab"
              aria-selected={filter === c.key}
              onClick={() => setFilter(c.key)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors",
                filter === c.key ? "bg-ink text-white" : "border border-line bg-surface text-ink-2",
              )}
            >
              {c.label}
              <span className={cn("rounded-full px-1.5 text-[10.5px] tabular", filter === c.key ? "bg-white/15" : "bg-sunken text-muted")}>{n}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong py-10 text-center text-[13.5px] text-muted">
          {filter === "overdue" ? "Nothing overdue. Nice work." : "Nothing here. Nice work."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((s) => {
            const p = properties.find((x) => x.id === s.propertyId)!;
            const room = rooms.find((r) => r.id === s.roomId);
            const late = isOverdue(s);
            return (
              <li key={s.id}>
                <button
                  onClick={() => setOpenJob(s.id)}
                  className={cn("group w-full overflow-hidden rounded-2xl border bg-surface text-left shadow-card transition-shadow hover:shadow-lift", late ? "border-orange-300" : "border-line")}
                >
                  <div className="flex gap-3 p-3">
                    <SnagPhoto snag={s} className="size-20 shrink-0" rounded="rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <RefTag>{s.ref}</RefTag>
                        <SeverityBadge severity={s.severity} />
                        <ChevronRight className="ml-auto size-4 text-faint transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <p className="mt-1 text-[14px] leading-snug font-semibold">{s.title}</p>
                      <p className="mt-0.5 truncate text-[12px] text-muted">{room?.name} · {s.locationInRoom}</p>
                      {s.status === "reopened" && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-rose-700"><RotateCcw className="size-3" /> Sent back by the owner</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-line bg-canvas px-3 py-2 text-[12px]">
                    <span className="flex min-w-0 items-center gap-1 text-muted"><MapPin className="size-3.5 shrink-0" /><span className="truncate">{p.addressLine1}, {p.town}</span></span>
                    {s.dueDate && (
                      <span className={cn("ml-auto flex shrink-0 items-center gap-1", late ? "font-semibold text-sev-major" : "text-muted")}>
                        <CalendarClock className="size-3.5" /> {late ? "Overdue" : formatDate(s.dueDate)}
                      </span>
                    )}
                    <span className={cn(!s.dueDate && "ml-auto")}><StatusBadge status={s.status} /></span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {openJob && <JobSheet snagId={openJob} onClose={() => setOpenJob(null)} />}
    </div>
  );
}
