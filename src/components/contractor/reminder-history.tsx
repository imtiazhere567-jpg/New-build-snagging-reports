"use client";

import { useMemo, useState } from "react";
import { BellRing, Bot, ChevronRight, History, Mail, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Avatar, Button } from "@/components/ui/primitives";
import { useStore } from "@/lib/data/store";
import type { DemoEmail } from "@/lib/types";
import { formatDateTime, timeAgo } from "@/lib/utils";

/** Reminders already sent for one invoice or quote, newest first. */
export function useReminders(refId: string | undefined) {
  const emails = useStore((s) => s.emails);
  return useMemo(
    () => (refId ? emails.filter((e) => e.refId === refId).sort((a, b) => b.sentAt.localeCompare(a.sentAt)) : []),
    [emails, refId],
  );
}

/** Timeline of reminders for an invoice or quote. Click one to read exactly what was sent. */
export function ReminderHistory({ refId, label }: { refId: string; label: "invoice" | "quote" }) {
  const list = useReminders(refId);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = list.find((e) => e.id === openId) ?? null;

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
          <History className="size-3.5" /> Reminder history
        </p>
        <span className="text-[12px] text-muted">
          {list.length === 0 ? "None sent yet" : `${list.length} sent · last ${timeAgo(list[0].sentAt)}`}
        </span>
      </div>

      {list.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-[13px] text-muted">
          <BellRing className="size-4" /> No reminders have been sent for this {label} yet.
        </p>
      ) : (
        <ol className="overflow-hidden rounded-2xl border border-line">
          {list.map((e, i) => (
            <li key={e.id} className="border-b border-line last:border-0">
              <button
                onClick={() => setOpenId(e.id)}
                className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-canvas"
                aria-label={`Open reminder sent ${formatDateTime(e.sentAt)}`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11.5px] font-semibold text-brand-700 tabular">
                  {list.length - i}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-medium">{e.subject}</p>
                    {e.sentById === "system" && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-canvas px-1.5 py-px text-[10.5px] font-semibold text-ink-2">
                        <Bot className="size-2.5" /> Auto
                      </span>
                    )}
                    {e.edited && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-1.5 py-px text-[10.5px] font-semibold text-brand-700">
                        <Pencil className="size-2.5" /> Edited
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[12px] text-muted">
                    {formatDateTime(e.sentAt)} · {timeAgo(e.sentAt)} · to {e.to}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {open && <SentEmailModal email={open} number={list.length - list.indexOf(open)} total={list.length} onClose={() => setOpenId(null)} />}
    </section>
  );
}

/** Read-only view of an email exactly as it was sent. */
function SentEmailModal({ email, number, total, onClose }: { email: DemoEmail; number: number; total: number; onClose: () => void }) {
  const sender = useStore((s) => s.users.find((u) => u.id === email.sentById));
  const company = useStore((s) => s.settings.name);
  return (
    <Modal
      open
      onClose={onClose}
      icon={<Mail className="size-5" />}
      title={`Reminder ${number} of ${total}`}
      description={`Sent ${formatDateTime(email.sentAt)} (${timeAgo(email.sentAt)})`}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
        {sender ? (
          <span className="inline-flex items-center gap-1.5">
            <Avatar user={sender} size={18} /> Sent by {sender.name}
          </span>
        ) : email.sentById === "system" ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-ink-2">
            <Bot className="size-4 text-brand-600" /> Sent automatically
          </span>
        ) : null}
        <span className={email.edited ? "font-medium text-brand-700" : ""}>
          · {email.edited ? "Wording edited before sending" : "Default wording"}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-line">
        <dl className="space-y-1 border-b border-line bg-canvas px-4 py-3 text-[12.5px]">
          <div className="flex gap-2"><dt className="w-16 shrink-0 text-muted">From</dt><dd className="font-medium">{company} via SnagSnap</dd></div>
          <div className="flex gap-2"><dt className="w-16 shrink-0 text-muted">To</dt><dd className="font-medium">{email.to}</dd></div>
          <div className="flex gap-2"><dt className="w-16 shrink-0 text-muted">Subject</dt><dd className="font-medium">{email.subject}</dd></div>
        </dl>
        <p className="px-4 py-4 text-[13.5px] leading-relaxed whitespace-pre-line text-ink-2">{email.body}</p>
      </div>
      <p className="mt-3 text-[12px] text-faint">{email.read ? "The owner has opened this email." : "Not opened yet."}</p>
    </Modal>
  );
}
