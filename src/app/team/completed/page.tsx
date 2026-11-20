"use client";

import { useState } from "react";
import { CheckCheck, ChevronRight, Hourglass, MapPin, PartyPopper } from "lucide-react";
import { RefTag, SeverityBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { JobSheet } from "@/components/team/job-sheet";
import { useStore } from "@/lib/data/store";
import { cn, formatDate, timeAgo } from "@/lib/utils";

type Tab = "awaiting" | "verified";

/** Jobs this tradesperson has finished: waiting for the owner's check, and confirmed. */
export default function TeamCompleted() {
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))!;
  const snags = useStore((s) => s.snags);
  const properties = useStore((s) => s.properties);
  const rooms = useStore((s) => s.rooms);
  const updates = useStore((s) => s.updates);
  const [tab, setTab] = useState<Tab>("awaiting");
  const [openJob, setOpenJob] = useState<string | null>(null);

  const mine = snags.filter((s) => s.assigneeId === me.id);
  const awaiting = mine.filter((s) => s.status === "fixed");
  const verified = mine.filter((s) => s.status === "verified");
  const list = (tab === "awaiting" ? awaiting : verified).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const fixedAt = (id: string) => updates.filter((u) => u.snagId === id && u.toStatus === "fixed").map((u) => u.createdAt).sort().at(-1);

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Completed</h1>
        <p className="text-[13px] text-muted">{verified.length} confirmed by owners · {awaiting.length} waiting for a check</p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="tablist">
        {(
          [
            ["awaiting", "Awaiting check", awaiting.length, Hourglass],
            ["verified", "Verified", verified.length, CheckCheck],
          ] as const
        ).map(([key, label, n, Icon]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={cn("rounded-2xl p-3.5 text-left transition-all", active ? "bg-night text-white shadow-lift" : "border border-line bg-surface")}
            >
              <Icon className={cn("size-4", active ? "text-highlight" : "text-faint")} />
              <p className="mt-2 text-[24px] leading-none font-semibold tabular">{n}</p>
              <p className={cn("mt-1.5 text-[11.5px]", active ? "text-white/60" : "text-muted")}>{label}</p>
            </button>
          );
        })}
      </div>

      <p className="text-[12.5px] text-muted">
        {tab === "awaiting"
          ? "You've marked these fixed. The owner checks each one and confirms it, or sends it back to you."
          : "The owner has confirmed these are done."}
      </p>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
          <PartyPopper className="mx-auto size-6 text-brand-600" />
          <p className="mt-2 text-[13.5px] text-muted">{tab === "awaiting" ? "Nothing waiting for a check." : "No confirmed jobs yet."}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {list.map((s) => {
            const p = properties.find((x) => x.id === s.propertyId);
            const when = tab === "awaiting" ? fixedAt(s.id) : s.updatedAt;
            return (
              <li key={s.id}>
                <button onClick={() => setOpenJob(s.id)} className="group flex w-full gap-3 rounded-2xl border border-line bg-surface p-3 text-left hover:shadow-card">
                  <SnagPhoto snag={s} className="size-16 shrink-0" rounded="rounded-xl" showBox={false} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <RefTag>{s.ref}</RefTag>
                      <SeverityBadge severity={s.severity} />
                    </div>
                    <p className="mt-1 truncate text-[13.5px] font-semibold">{s.title}</p>
                    <p className="flex items-center gap-1 truncate text-[12px] text-muted">
                      <MapPin className="size-3 shrink-0" /> {p?.addressLine1} · {rooms.find((r) => r.id === s.roomId)?.name}
                    </p>
                    {when && (
                      <p className={cn("mt-1 text-[11.5px] font-medium", tab === "awaiting" ? "text-amber-700" : "text-emerald-700")}>
                        {tab === "awaiting" ? `Fixed ${timeAgo(when)}` : `Confirmed ${formatDate(when)}`}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-faint" />
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
