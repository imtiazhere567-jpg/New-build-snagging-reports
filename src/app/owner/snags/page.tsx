"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Pencil,
  PencilLine,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { Button, ButtonLink, RefTag, SeverityBadge, StatusBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { Dropdown } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Modal } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { ManualSnagModal } from "@/components/owner/manual-snag-modal";
import { OwnerSnagDetailModal } from "@/components/owner/snag-detail-modal";
import { BalanceDuePrompt } from "@/components/owner/balance-due-prompt";
import { useStore } from "@/lib/data/store";
import { CATEGORIES, SEVERITIES, SEVERITY_META, STATUS_META, TRADE_LABEL } from "@/lib/constants";
import type { Category, Severity, Snag, SnagStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const LOW_CONFIDENCE = 0.6;

export default function OwnerSnagsPage() {
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))!;
  const property = useStore((s) => s.properties.find((p) => p.ownerId === me.id));
  const allSnags = useStore((s) => s.snags);
  const rooms = useStore((s) => s.rooms);
  const company = useStore((s) => s.settings.name);
  const submitDraft = useStore((s) => s.submitDraft);

  const drafts = allSnags.filter((s) => s.propertyId === property?.id && s.status === "ai_draft");
  const sent = allSnags.filter((s) => s.propertyId === property?.id && s.status !== "ai_draft");
  const [tab, setTab] = useState<"draft" | "sent">(drafts.length ? "draft" : "sent");
  const [confirmSend, setConfirmSend] = useState(false);
  const [justSent, setJustSent] = useState<number | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  if (!property) return <p className="text-muted">No home is linked to this account.</p>;

  const homeRooms = rooms.filter((r) => r.propertyId === property.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const roomName = (id: string) => homeRooms.find((r) => r.id === id)?.name ?? "Room";
  const needsCheck = drafts.filter((s) => !s.reviewed && s.confidence < LOW_CONFIDENCE);
  const unchecked = drafts.filter((s) => !s.reviewed);

  const send = () => {
    const res = submitDraft(property.id);
    setConfirmSend(false);
    if (res) {
      setJustSent(res.count);
      toast({ title: `${res.count} snags sent to ${company}`, body: "You'll get an email when your quote is ready." });
    }
  };

  /* ---------- Sent successfully ---------- */
  if (justSent !== null) {
    return (
      <div className="animate-fade-up py-10 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.02em]">Report sent</h1>
        <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-muted">
          {justSent} {justSent === 1 ? "snag has" : "snags have"} gone to {company}. They&apos;ll price the work and send you a quote, usually within 2 working days.
        </p>
        <div className="mt-7 flex flex-col gap-2">
          <ButtonLink href="/owner" size="lg">Back to home</ButtonLink>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setJustSent(null);
              setTab("sent");
            }}
          >
            See what I sent
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-4 pb-24">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">My snags</h1>
        <p className="text-[13px] text-muted">{property.addressLine1}, {property.town}</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 rounded-xl border border-line-strong bg-surface p-0.5" role="tablist">
        {(
          [
            ["draft", "To send", drafts.length],
            ["sent", "Sent", sent.length],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn("flex h-9 items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-medium", tab === key ? "bg-ink text-white" : "text-ink-2")}
          >
            {label}
            <span className={cn("rounded px-1.5 text-[11px] tabular", tab === key ? "bg-white/15" : "bg-sunken text-muted")}>{n}</span>
          </button>
        ))}
      </div>

      {/* ---------------- Drafts ---------------- */}
      {tab === "draft" &&
        (drafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-blueprint px-6 py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-line bg-surface text-brand-600"><Camera className="size-6" /></span>
            <p className="mt-3 font-semibold">Nothing waiting to send</p>
            <p className="mt-1 text-[13px] text-muted">Photograph a problem and the AI will write it up for you.</p>
            <ButtonLink href="/owner/capture" className="mt-5">
              <Camera className="size-4" /> Start capturing
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-line bg-surface p-3.5">
              <p className="flex items-center gap-2 text-[13.5px] font-semibold">
                <Sparkles className="size-4 text-brand-600" /> Check what the AI wrote
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                Tap <b className="text-ink-2">Looks right</b> on each one, or <b className="text-ink-2">Edit</b> anything that isn&apos;t. Nothing goes to {company} until you press Send.
              </p>
              {needsCheck.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-amber-800">
                  <AlertTriangle className="size-4" /> {needsCheck.length} {needsCheck.length === 1 ? "needs" : "need"} a closer look. The AI wasn&apos;t sure.
                </p>
              )}
            </div>

            {homeRooms
              .map((r) => ({ r, items: drafts.filter((s) => s.roomId === r.id) }))
              .filter((g) => g.items.length)
              .map(({ r, items }) => (
                <section key={r.id}>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {r.name} <span className="font-normal normal-case tracking-normal">· {items.length}</span>
                  </p>
                  <ul className="space-y-2.5">
                    {items.map((s) => <DraftCard key={s.id} snag={s} />)}
                  </ul>
                </section>
              ))}

            <button onClick={() => setManualOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong py-3.5 text-[13.5px] font-medium text-ink-2 hover:bg-surface">
              <PencilLine className="size-4" /> Add a snag by hand
            </button>

            {/* Send bar */}
            <div className="sticky bottom-[84px] z-10">
              <button
                onClick={() => setConfirmSend(true)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-brand-600 px-4 py-3.5 text-left text-white shadow-lift transition-colors hover:bg-brand-700"
              >
                <span>
                  <span className="block text-[14.5px] font-semibold">Send {drafts.length} {drafts.length === 1 ? "snag" : "snags"} to {company.split(" ")[0]}</span>
                  <span className="block text-[12px] text-white/70">
                    {unchecked.length ? `${unchecked.length} not checked yet` : "All checked"} · {new Set(drafts.map((d) => d.roomId)).size} rooms
                  </span>
                </span>
                <Send className="size-5 shrink-0" />
              </button>
            </div>
          </>
        ))}

      {/* ---------------- Sent ---------------- */}
      {tab === "sent" && <SentList snags={sent} roomName={roomName} />}

      <ConfirmDialog
        open={confirmSend}
        icon={<Send className="size-5" />}
        title={`Send ${drafts.length} snags to ${company}?`}
        description="They'll price the work and send you a quote. You can still add more snags later."
        confirmLabel="Send report"
        confirmIcon={<Send className="size-4" />}
        onCancel={() => setConfirmSend(false)}
        onConfirm={send}
      >
        <div className="grid grid-cols-4 gap-2">
          {SEVERITIES.map((sev) => (
            <div key={sev} className="rounded-xl border border-line p-2.5 text-center">
              <p className={cn("text-[18px] font-semibold tabular", SEVERITY_META[sev].text)}>{drafts.filter((d) => d.severity === sev).length}</p>
              <p className="text-[11px] text-muted">{SEVERITY_META[sev].label}</p>
            </div>
          ))}
        </div>
        {unchecked.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {unchecked.length} {unchecked.length === 1 ? "snag hasn't" : "snags haven't"} been checked. They&apos;ll be sent as the AI wrote them.
          </p>
        )}
      </ConfirmDialog>

      {manualOpen && <ManualSnagModal propertyId={property.id} roomId={homeRooms[0]?.id ?? ""} onClose={() => setManualOpen(false)} />}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* One AI draft: check, edit or delete                               */
/* ---------------------------------------------------------------- */

function DraftCard({ snag }: { snag: Snag }) {
  const updateSnag = useStore((s) => s.updateSnag);
  const deleteSnag = useStore((s) => s.deleteSnag);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState({ title: snag.title, locationInRoom: snag.locationInRoom, description: snag.description, severity: snag.severity, category: snag.category });
  const low = snag.confidence < LOW_CONFIDENCE && !snag.reviewed;

  const save = () => {
    updateSnag(snag.id, { ...draft, title: draft.title.trim() || snag.title, reviewed: true });
    setEditing(false);
  };

  return (
    <li className={cn("overflow-hidden rounded-2xl border bg-surface", low ? "border-amber-300 ring-2 ring-amber-200/60" : snag.reviewed ? "border-brand-200" : "border-line")}>
      {snag.photoUrl ? (
        <SnagPhoto snag={snag} className="aspect-[4/3] w-full" rounded="rounded-none" />
      ) : (
        <div className="flex items-center gap-2 border-b border-line bg-canvas px-3.5 py-2 text-[12px] text-muted"><PencilLine className="size-3.5" /> Added by hand, no photo</div>
      )}

      <div className="p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <SeverityBadge severity={editing ? draft.severity : snag.severity} />
          <span className="text-[12px] text-muted">{TRADE_LABEL[snag.trade]}</span>
          {snag.source === "ai" && (
            <span className={cn("ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", low ? "bg-amber-100 text-amber-800" : "bg-brand-50 text-brand-700")}>
              <Sparkles className="size-3" /> {snag.aiSource === "claude" ? "Claude" : "Demo AI"} · {Math.round(snag.confidence * 100)}% sure
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-3 space-y-2.5">
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Title" className="h-10 w-full rounded-xl border border-line-strong px-3 text-[14px] font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
            <input value={draft.locationInRoom} onChange={(e) => setDraft({ ...draft, locationInRoom: e.target.value })} placeholder="Where in the room" aria-label="Location in room" className="h-10 w-full rounded-xl border border-line-strong px-3 text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
            <textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} aria-label="Description" className="w-full resize-none rounded-xl border border-line-strong px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
            <div className="grid grid-cols-4 gap-1">
              {SEVERITIES.map((sev) => (
                <button
                  key={sev}
                  onClick={() => setDraft({ ...draft, severity: sev as Severity })}
                  aria-pressed={draft.severity === sev}
                  className={cn("h-9 rounded-lg text-[12px] font-medium", draft.severity === sev ? "bg-ink text-white" : "border border-line text-ink-2")}
                >
                  {SEVERITY_META[sev].label}
                </button>
              ))}
            </div>
            <Dropdown label="Type" value={draft.category} onChange={(v) => setDraft({ ...draft, category: v as Category })} placement="top" menuWidth={260} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
              <Button className="flex-1" onClick={save}><Check className="size-4" /> Save</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-[15px] leading-snug font-semibold">{snag.title}</p>
            {snag.locationInRoom && <p className="mt-0.5 text-[12.5px] text-muted">{snag.locationInRoom}</p>}
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{snag.description}</p>
            {snag.ownerNote && <p className="mt-2 text-[12px] text-faint">Your note: “{snag.ownerNote}”</p>}
            {low && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[12.5px] text-amber-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> The AI isn&apos;t sure about this one. Please check it&apos;s right.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              {snag.reviewed ? (
                <span className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-50 text-[13px] font-medium text-brand-700">
                  <CheckCircle2 className="size-4" /> Checked
                </span>
              ) : (
                <Button className="flex-1" onClick={() => updateSnag(snag.id, { reviewed: true })}>
                  <ThumbsUp className="size-4" /> Looks right
                </Button>
              )}
              <Button variant="secondary" onClick={() => setEditing(true)} aria-label="Edit"><Pencil className="size-4" /> Edit</Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(true)} aria-label="Delete snag"><Trash2 className="size-4" /></Button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        icon={<Trash2 className="size-5" />}
        title="Remove this snag?"
        description={snag.title}
        confirmLabel="Remove"
        confirmIcon={<Trash2 className="size-4" />}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteSnag(snag.id);
          toast({ title: "Snag removed", tone: "info" });
        }}
      />
    </li>
  );
}

/* ---------------------------------------------------------------- */
/* Sent snags: follow progress and confirm fixes                     */
/* ---------------------------------------------------------------- */

const GROUPS: { key: string; label: string; statuses: SnagStatus[] }[] = [
  { key: "check", label: "Fixed: please check", statuses: ["fixed"] },
  { key: "work", label: "Being worked on", statuses: ["assigned", "in_progress", "reopened", "accepted"] },
  { key: "waiting", label: "Waiting for a quote or your decision", statuses: ["submitted", "quoted"] },
  { key: "done", label: "Done", statuses: ["verified"] },
  { key: "declined", label: "Not going ahead", statuses: ["declined"] },
];

function SentList({ snags, roomName }: { snags: Snag[]; roomName: (id: string) => string }) {
  const confirmFix = useStore((s) => s.confirmFix);
  const [reopen, setReopen] = useState<Snag | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  // Set when confirming the last fix raised the final balance
  const [balanceId, setBalanceId] = useState<string | null>(null);
  const detail = snags.find((x) => x.id === detailId);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["check", "work", "waiting"]));

  if (snags.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line-strong py-12 text-center text-[13.5px] text-muted">You haven&apos;t sent any snags yet.</p>;
  }

  return (
    <div className="space-y-3">
      {GROUPS.map((g) => {
        const items = snags.filter((s) => g.statuses.includes(s.status));
        if (!items.length) return null;
        const open = openGroups.has(g.key);
        return (
          <section key={g.key} className={cn("overflow-hidden rounded-2xl border bg-surface", g.key === "check" ? "border-teal-300" : "border-line")}>
            <button
              onClick={() => setOpenGroups((cur) => { const n = new Set(cur); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}
              className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
              aria-expanded={open}
            >
              <p className="flex-1 text-[13.5px] font-semibold">{g.label}</p>
              <span className="rounded-full bg-sunken px-2 text-[11.5px] font-semibold text-ink-2 tabular">{items.length}</span>
              <ChevronDown className={cn("size-4 text-faint transition-transform", open && "rotate-180")} />
            </button>
            {open && (
              <ul className="divide-y divide-line border-t border-line">
                {items.map((s) => (
                  <li key={s.id} className="p-3">
                    <button
                      onClick={() => setDetailId(s.id)}
                      className="-m-1.5 flex w-[calc(100%+12px)] gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-canvas focus-visible:ring-2 focus-visible:ring-brand-500/40 outline-none"
                      aria-label={`Open ${s.ref} ${s.title}`}
                    >
                      <SnagPhoto snag={s} className="size-14 shrink-0" rounded="rounded-lg" showBox={false} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <RefTag>{s.ref}</RefTag>
                          <StatusBadge status={s.status} />
                        </div>
                        <p className="mt-1 text-[13.5px] leading-snug font-medium">{s.title}</p>
                        <p className="text-[12px] text-muted">{roomName(s.roomId)} · {STATUS_META[s.status].label} {formatDate(s.updatedAt)}</p>
                      </div>
                      <ChevronRight className="mt-5 size-4 shrink-0 text-faint" />
                    </button>
                    {s.status === "fixed" && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setBalanceId(confirmFix(s.id));
                            toast({ title: `${s.ref} confirmed fixed`, body: "Thanks! It's now marked as done." });
                          }}
                        >
                          <ThumbsUp className="size-3.5" /> It&apos;s fixed
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setReopen(s)}>
                          <ThumbsDown className="size-3.5" /> Not fixed
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {detail && (
        <OwnerSnagDetailModal
          snag={detail}
          roomName={roomName(detail.roomId)}
          onClose={() => setDetailId(null)}
          onConfirmed={setBalanceId}
          onNotFixed={(x) => {
            setDetailId(null);
            setReopen(x);
          }}
        />
      )}
      {reopen && <ReopenModal snag={reopen} onClose={() => setReopen(null)} />}
      {balanceId && <BalanceDuePrompt invoiceId={balanceId} onClose={() => setBalanceId(null)} />}
    </div>
  );
}

function ReopenModal({ snag, onClose }: { snag: Snag; onClose: () => void }) {
  const reopenFix = useStore((s) => s.reopenFix);
  const [note, setNote] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      icon={<ThumbsDown className="size-5" />}
      title="What's still wrong?"
      description={`${snag.ref} · ${snag.title}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!note.trim()}
            onClick={() => {
              reopenFix(snag.id, note.trim());
              toast({ title: `${snag.ref} sent back`, body: "The team member has been told it isn't fixed yet." });
              onClose();
            }}
          >
            Send back
          </Button>
        </>
      }
    >
      <textarea
        rows={4}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. The new tile has a lip on the left edge."
        aria-label="What's still wrong"
        className="w-full resize-none rounded-xl border border-line-strong px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
      />
      <p className="mt-2 text-[12px] text-muted">Your builder and the team member will see this note.</p>
      <Link href="/owner/capture" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-700"><Camera className="size-3.5" /> Add a photo of the problem</Link>
    </Modal>
  );
}
