"use client";

import { useState } from "react";
import { BellRing, Pencil, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm";
import type { EmailOverride } from "@/lib/data/store";
import { cn } from "@/lib/utils";

/**
 * Confirm-before-send popup with an editable email.
 * Render it only while open, so each opening starts from the default wording.
 */
export function ReminderDialog({
  title,
  description,
  to,
  defaultSubject,
  defaultBody,
  onSend,
  onCancel,
}: {
  title: string;
  description?: string;
  to: string;
  defaultSubject: string;
  defaultBody: string;
  onSend: (email: EmailOverride, edited: boolean) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const edited = subject !== defaultSubject || body !== defaultBody;
  const empty = !subject.trim() || !body.trim();

  return (
    <ConfirmDialog
      open
      icon={<BellRing className="size-5" />}
      title={title}
      description={description}
      confirmLabel={edited ? "Send edited reminder" : "Send reminder"}
      confirmIcon={<BellRing className="size-4" />}
      confirmDisabled={empty}
      onConfirm={() => onSend({ subject: subject.trim(), body: body.trim() }, edited)}
      onCancel={onCancel}
    >
      <div className="overflow-hidden rounded-xl border border-line focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/15">
        <div className="flex items-center gap-2 border-b border-line bg-canvas px-3.5 py-2.5 text-[12.5px]">
          <span className="w-14 shrink-0 text-muted">To</span>
          <span className="truncate font-medium">{to}</span>
        </div>
        <label className="flex items-center gap-2 border-b border-line px-3.5 text-[12.5px]">
          <span className="w-14 shrink-0 text-muted">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Email subject"
            className="h-10 w-full bg-transparent text-[13px] font-medium outline-none"
          />
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          aria-label="Email message"
          className="block w-full resize-y bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-ink-2 outline-none"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[12px]">
        <span className={cn("flex items-center gap-1.5", empty ? "text-red-600" : edited ? "font-medium text-brand-700" : "text-muted")}>
          <Pencil className="size-3.5" />
          {empty ? "Subject and message can't be empty" : edited ? "Edited: your wording will be sent" : "You can edit the subject and message before sending"}
        </span>
        {edited && (
          <button
            type="button"
            onClick={() => {
              setSubject(defaultSubject);
              setBody(defaultBody);
            }}
            className="inline-flex shrink-0 items-center gap-1 font-medium text-muted hover:text-ink"
          >
            <RotateCcw className="size-3.5" /> Reset to default
          </button>
        )}
      </div>
    </ConfirmDialog>
  );
}
