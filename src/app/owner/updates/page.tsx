"use client";

import { useMemo, useState } from "react";
import { BellRing, CheckCircle2, Hammer, MessageSquareText, Sparkles, UserCheck } from "lucide-react";
import { Avatar, RefTag, StatusBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { Modal } from "@/components/ui/overlay";
import { useStore } from "@/lib/data/store";
import { STATUS_META, TRADE_LABEL } from "@/lib/constants";
import type { Snag, SnagUpdate } from "@/lib/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";

type Filter = "all" | "notes" | "fixed" | "status";
const PAGE = 15;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "notes", label: "Progress notes" },
  { key: "fixed", label: "Fixes" },
  { key: "status", label: "Status changes" },
];
const matches = (u: SnagUpdate, f: Filter) =>
  f === "all" ? true : f === "notes" ? u.kind === "progress" : f === "fixed" ? u.toStatus === "fixed" || u.toStatus === "verified" : u.kind === "status" || u.kind === "assign";

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default function OwnerUpdatesPage() {
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))!;
  const property = useStore((s) => s.properties.find((p) => p.ownerId === me.id));
  const updates = useStore((s) => s.updates);
  const snags = useStore((s) => s.snags);
  const users = useStore((s) => s.users);
  const [filter, setFilter] = useState<Filter>("all");
  const [openSnag, setOpenSnag] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const mine = useMemo(
    () => updates.filter((u) => u.propertyId === property?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [updates, property?.id],
  );
  if (!property) return <p className="text-muted">No home is linked to this account.</p>;

  const filtered = mine.filter((u) => matches(u, filter));
  const list = filtered.slice(0, limit);
  const groups: { day: string; items: SnagUpdate[] }[] = [];
  for (const u of list) {
    const day = dayLabel(u.createdAt);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(u);
    else groups.push({ day, items: [u] });
  }
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = mine.filter((u) => new Date(u.createdAt) >= weekAgo).length;
  const snag = snags.find((s) => s.id === openSnag);

  return (
    <div className="animate-fade-up space-y-4 pb-10">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Updates</h1>
        <p className="text-[13px] text-muted">
          {mine.length ? `${thisWeek} ${thisWeek === 1 ? "update" : "updates"} in the last 7 days` : "Everything your builder does on your snags appears here."}
        </p>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none" role="tablist">
        {FILTERS.map((f) => {
          const n = mine.filter((u) => matches(u, f.key)).length;
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setLimit(PAGE);
              }}
              className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium", filter === f.key ? "bg-ink text-white" : "border border-line bg-surface text-ink-2")}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-[10.5px] tabular", filter === f.key ? "bg-white/15" : "bg-sunken text-muted")}>{n}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-blueprint px-6 py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-line bg-surface text-brand-600"><BellRing className="size-6" /></span>
          <p className="mt-3 font-semibold">No updates yet</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">When your builder&apos;s team starts work, every note, photo and fix shows up here.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.day}>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">{g.day}</p>
            <ol className="space-y-2">
              {g.items.map((u) => {
                const s = snags.find((x) => x.id === u.snagId);
                const actor = users.find((x) => x.id === u.actorId);
                const isMe = u.actorId === me.id;
                return (
                  <li key={u.id}>
                    <button onClick={() => s && setOpenSnag(s.id)} className="flex w-full gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:bg-canvas">
                      <UpdateIcon update={u} actor={actor} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="min-w-0 flex-1 text-[13px] leading-snug">
                            <span className="font-semibold">{isMe ? "You" : actor?.name ?? "SnagSnap"}</span>{" "}
                            <span className="text-ink-2">{verb(u, isMe)}</span>
                          </p>
                          <span className="shrink-0 text-[11px] text-faint">{timeAgo(u.createdAt)}</span>
                        </div>
                        {s && (
                          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                            <RefTag>{s.ref}</RefTag> <span className="truncate">{s.title}</span>
                          </p>
                        )}
                        {u.note && <p className="mt-1.5 rounded-xl bg-canvas px-2.5 py-1.5 text-[13px] leading-snug text-ink-2">{u.note}</p>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}

      {filtered.length > limit && (
        <button
          onClick={() => setLimit((l) => l + PAGE)}
          className="w-full rounded-2xl border border-line bg-surface py-3 text-[13.5px] font-medium text-brand-700 hover:bg-canvas"
        >
          Show older updates ({filtered.length - limit} more)
        </button>
      )}

      {snag && <SnagSheet snag={snag} onClose={() => setOpenSnag(null)} />}
    </div>
  );
}

function verb(u: SnagUpdate, isMe: boolean) {
  if (u.kind === "progress") return "posted an update";
  if (u.kind === "assign") return u.note?.startsWith("Auto-assigned") ? "assigned the job by trade" : "assigned the job";
  if (u.toStatus === "verified") return isMe ? "confirmed it's fixed" : "confirmed the fix";
  if (u.toStatus === "reopened") return isMe ? "sent it back" : "reopened the job";
  if (u.toStatus) return `marked it ${STATUS_META[u.toStatus].label.toLowerCase()}`;
  return "updated the job";
}

function UpdateIcon({ update, actor }: { update: SnagUpdate; actor?: ReturnType<typeof useStore.getState>["users"][number] }) {
  if (actor) {
    const badge =
      update.toStatus === "fixed" || update.toStatus === "verified" ? <CheckCircle2 className="size-3 text-white" /> : update.kind === "progress" ? <MessageSquareText className="size-3 text-white" /> : <Hammer className="size-3 text-white" />;
    return (
      <span className="relative shrink-0">
        <Avatar user={actor} size={34} />
        <span className={cn("absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full ring-2 ring-surface", update.toStatus === "fixed" || update.toStatus === "verified" ? "bg-emerald-600" : "bg-ink-2")}>{badge}</span>
      </span>
    );
  }
  return (
    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
      {update.kind === "assign" ? <UserCheck className="size-4" /> : <Sparkles className="size-4" />}
    </span>
  );
}

/** One snag in detail: photo, who's on it, and its whole history. */
function SnagSheet({ snag, onClose }: { snag: Snag; onClose: () => void }) {
  const users = useStore((s) => s.users);
  const updates = useStore((s) => s.updates);
  const room = useStore((s) => s.rooms.find((r) => r.id === snag.roomId));
  const me = useStore((s) => s.currentUserId);
  const assignee = users.find((u) => u.id === snag.assigneeId);
  const history = updates.filter((u) => u.snagId === snag.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <Modal open onClose={onClose} title={snag.title} description={`${snag.ref} · ${room?.name}`}>
      <SnagPhoto snag={snag} className="aspect-[4/3] w-full" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={snag.status} />
        {snag.dueDate && <span className="text-[12px] text-muted">Target date {formatDate(snag.dueDate)}</span>}
      </div>
      {assignee && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-canvas p-3">
          <Avatar user={assignee} size={34} />
          <div>
            <p className="text-[13.5px] font-medium">{assignee.name}</p>
            <p className="text-[12px] text-muted">{TRADE_LABEL[assignee.trade!]} · working on this for you</p>
          </div>
        </div>
      )}
      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{snag.description}</p>

      <p className="mt-5 mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">History</p>
      <ol className="relative space-y-3 border-l border-line pl-4">
        <li className="relative">
          <span className="absolute top-1 -left-[21px] size-2.5 rounded-full bg-line-strong" />
          <p className="text-[12.5px]"><span className="font-medium">You reported it</span> <span className="text-faint">· {formatDate(snag.createdAt)}</span></p>
        </li>
        {history.map((u) => {
          const who = u.actorId === me ? "You" : users.find((x) => x.id === u.actorId)?.name ?? "SnagSnap";
          return (
            <li key={u.id} className="relative">
              <span className={cn("absolute top-1 -left-[21px] size-2.5 rounded-full", u.toStatus ? STATUS_META[u.toStatus].dot : "bg-brand-500")} />
              <p className="text-[12.5px]">
                <span className="font-medium">{who}</span> <span className="text-ink-2">{verb(u, who === "You")}</span>{" "}
                <span className="text-faint">· {timeAgo(u.createdAt)}</span>
              </p>
              {u.note && <p className="mt-0.5 text-[12.5px] text-muted">{u.note}</p>}
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}
