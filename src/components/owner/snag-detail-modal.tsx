"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardList, MapPin, PoundSterling, ThumbsDown, ThumbsUp, Wrench } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Avatar, Button, RefTag, SeverityBadge, StatusBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/data/store";
import { STATUS_META, TRADE_LABEL } from "@/lib/constants";
import type { Snag } from "@/lib/types";
import { cn, formatDate, formatGBP } from "@/lib/utils";

/** Everything the owner can see about one sent snag: photo, write-up, quote line, who's on it and its history. */
export function OwnerSnagDetailModal({
  snag,
  roomName,
  onClose,
  onNotFixed,
  onConfirmed,
}: {
  snag: Snag;
  roomName: string;
  onClose: () => void;
  onNotFixed: (s: Snag) => void;
  /** Called after the owner confirms the fix; gets the balance invoice id when that was the last job. */
  onConfirmed?: (balanceInvoiceId: string | null) => void;
}) {
  const quotes = useStore((s) => s.quotes);
  const users = useStore((s) => s.users);
  const allUpdates = useStore((s) => s.updates);
  const confirmFix = useStore((s) => s.confirmFix);

  // The newest sent quote that includes this snag
  const quote = useMemo(
    () =>
      quotes
        .filter((q) => q.status !== "draft" && q.items.some((i) => i.snagId === snag.id))
        .sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt))[0],
    [quotes, snag.id],
  );
  const item = quote?.items.find((i) => i.snagId === snag.id);
  const assignee = users.find((u) => u.id === snag.assigneeId);
  const updates = useMemo(
    () => allUpdates.filter((u) => u.snagId === snag.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [allUpdates, snag.id],
  );

  const decisionText =
    item?.decision === "accepted" ? "You accepted this" : item?.decision === "declined" ? "You declined this" : "Waiting for your decision";

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      icon={<ClipboardList className="size-5" />}
      title={snag.title}
      description={`${snag.ref} · ${roomName}`}
      footer={
        snag.status === "fixed" ? (
          <>
            <Button variant="secondary" onClick={() => onNotFixed(snag)}>
              <ThumbsDown className="size-4" /> Not fixed
            </Button>
            <Button
              onClick={() => {
                const balanceId = confirmFix(snag.id);
                toast({ title: `${snag.ref} confirmed fixed`, body: "Thanks! It's now marked as done." });
                onClose();
                onConfirmed?.(balanceId);
              }}
            >
              <ThumbsUp className="size-4" /> It&apos;s fixed
            </Button>
          </>
        ) : snag.status === "quoted" ? (
          <>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Link
              href="/owner/billing"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[14px] font-semibold text-white hover:bg-brand-700"
            >
              Review the quote <ArrowRight className="size-4" />
            </Link>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SnagPhoto snag={snag} className="aspect-[4/3] w-full" />

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <RefTag>{snag.ref}</RefTag>
            <StatusBadge status={snag.status} />
            <SeverityBadge severity={snag.severity} />
          </div>
          <p className="flex items-start gap-1.5 text-[13px] text-ink-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-faint" /> {roomName}
            {snag.locationInRoom ? ` · ${snag.locationInRoom}` : ""}
          </p>
          <p className="text-[12.5px] text-muted">
            {STATUS_META[snag.status].label} {formatDate(snag.updatedAt)}
          </p>

          {/* Quote line */}
          {quote && item && (
            <div className="rounded-xl border border-line bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                <PoundSterling className="size-3.5" /> Quote {quote.number}
              </p>
              <p className="mt-1 text-[20px] font-semibold tabular">{formatGBP(item.price * (1 + quote.vatRate))}</p>
              <p className="text-[12px] text-muted">
                {formatGBP(item.price)} + VAT · {decisionText}
              </p>
            </div>
          )}

          {/* Who's on it */}
          {(assignee || snag.dueDate) && (
            <div className="flex items-center gap-3 rounded-xl border border-line p-3">
              {assignee ? <Avatar user={assignee} size={34} /> : <Wrench className="size-5 text-faint" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold">{assignee ? assignee.name : TRADE_LABEL[snag.trade]}</p>
                <p className="text-[12px] text-muted">{TRADE_LABEL[snag.trade]}</p>
              </div>
              {snag.dueDate && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-muted">
                  <CalendarClock className="size-3.5" /> by {formatDate(snag.dueDate)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">What&apos;s wrong</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{snag.description}</p>
          {snag.ownerNote && <p className="mt-1.5 text-[12.5px] text-muted">Your note: “{snag.ownerNote}”</p>}
        </section>
        {snag.suggestedFix && (
          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">How it should be fixed</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{snag.suggestedFix}</p>
          </section>
        )}

        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">History</h3>
          {updates.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-muted">Sent to your builder on {formatDate(snag.createdAt)}. No updates yet.</p>
          ) : (
            <ol className="mt-2 space-y-3 border-l border-line pl-4">
              {updates.map((u) => {
                const actor = users.find((x) => x.id === u.actorId);
                return (
                  <li key={u.id} className="relative">
                    <span className={cn("absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-surface", u.toStatus === "fixed" || u.toStatus === "verified" ? "bg-brand-600" : "bg-line-strong")} />
                    <p className="text-[13px]">
                      <span className="font-semibold">{actor?.name ?? "Your builder"}</span>
                      <span className="text-muted">
                        {u.toStatus ? ` · ${STATUS_META[u.toStatus].label}` : u.kind === "progress" ? " · posted an update" : ""} · {formatDate(u.createdAt)}
                      </span>
                    </p>
                    {u.note && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{u.note}</p>}
                    {u.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.photoUrl} alt="Progress photo" className="mt-2 h-28 rounded-lg border border-line object-cover" />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </Modal>
  );
}
