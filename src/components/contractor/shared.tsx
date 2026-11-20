"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import { Avatar, RefTag, SeverityBadge, StatusBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { useStore } from "@/lib/data/store";
import { isOverdue } from "@/lib/data/queries";
import { STATUS_META } from "@/lib/constants";
import type { Snag, SnagUpdate } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

/** Clickable snag row used in lists inside popups. */
export function SnagRow({ snag, onOpen, showAddress = true }: { snag: Snag; onOpen: (id: string) => void; showAddress?: boolean }) {
  const property = useStore((s) => s.properties.find((p) => p.id === snag.propertyId));
  const room = useStore((s) => s.rooms.find((r) => r.id === snag.roomId));
  const assignee = useStore((s) => s.users.find((u) => u.id === snag.assigneeId));
  const late = isOverdue(snag);
  return (
    <button
      onClick={() => onOpen(snag.id)}
      className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-canvas"
    >
      <SnagPhoto snag={snag} className="size-14 shrink-0" rounded="rounded-lg" showBox={false} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <RefTag>{snag.ref}</RefTag>
          <SeverityBadge severity={snag.severity} />
          {late && <span className="text-[11px] font-semibold text-sev-major">Overdue</span>}
        </div>
        <p className="mt-1 truncate text-[13.5px] font-medium">{snag.title}</p>
        <p className="truncate text-[12px] text-muted">
          {room?.name}
          {showAddress && property ? ` · ${property.addressLine1}, ${property.town}` : ""}
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
        <StatusBadge status={snag.status} />
        {assignee && (
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <Avatar user={assignee} size={16} /> {assignee.name.split(" ")[0]}
          </span>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/** One line of activity. */
export function ActivityItem({
  update,
  onOpenSnag,
  last,
  compact,
}: {
  update: SnagUpdate;
  onOpenSnag?: (id: string) => void;
  last?: boolean;
  compact?: boolean;
}) {
  const actor = useStore((s) => s.users.find((u) => u.id === update.actorId));
  const snag = useStore((s) => s.snags.find((x) => x.id === update.snagId));
  const property = useStore((s) => s.properties.find((p) => p.id === update.propertyId));
  const verb =
    update.kind === "progress"
      ? "posted an update on"
      : update.kind === "assign"
        ? "assigned"
        : update.toStatus
          ? `marked ${STATUS_META[update.toStatus].label.toLowerCase()}`
          : "updated";

  return (
    <li className={cn("relative flex gap-3 last:pb-0", compact ? "pb-3.5" : "pb-4")}>
      {!last && <span className="absolute top-8 bottom-0 left-[14px] w-px bg-line" />}
      {actor ? (
        <Avatar user={actor} size={29} />
      ) : (
        <span className="flex size-[29px] shrink-0 items-center justify-center rounded-full bg-brand-50 border border-brand-100">
          <Sparkles className="size-3.5 text-brand-600" />
        </span>
      )}
      <div className="min-w-0 flex-1 text-[13px]">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 flex-1 leading-snug">
            <span className="font-medium">{actor?.name ?? "SnagSnap"}</span> <span className="text-ink-2">{verb}</span>{" "}
            {snag && (
              <button
                onClick={() => onOpenSnag?.(snag.id)}
                className={cn("font-mono text-[11.5px] font-medium text-brand-700", onOpenSnag && "hover:underline")}
              >
                {snag.ref}
              </button>
            )}
          </p>
          <span className="shrink-0 text-[11.5px] text-faint">{timeAgo(update.createdAt)}</span>
        </div>
        <p className="truncate text-[12px] text-muted">
          {snag?.title} · {property?.addressLine1}
        </p>
        {update.note && compact && <p className="mt-0.5 truncate text-[12.5px] text-ink-2">“{update.note}”</p>}
        {update.note && !compact && (
          <p className="mt-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-[12.5px] leading-snug text-ink-2 border border-line">{update.note}</p>
        )}
      </div>
    </li>
  );
}

export function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] text-muted">{label}</p>
      <div className="mt-0.5 truncate text-[13.5px] font-medium">{children}</div>
    </div>
  );
}

export function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line-strong py-8 text-center text-[13px] text-muted">{children}</p>;
}
