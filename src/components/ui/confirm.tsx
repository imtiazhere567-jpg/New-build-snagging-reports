"use client";

import { Modal } from "./overlay";
import { Button } from "./primitives";

/** Small "are you sure?" popup used before anything that emails a client or records money. */
export function ConfirmDialog({
  open,
  icon,
  title,
  description,
  children,
  confirmLabel,
  confirmIcon,
  confirmDisabled,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel: string;
  confirmIcon?: React.ReactNode;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      icon={icon}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm} disabled={confirmDisabled}>
            {confirmIcon} {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

/** Preview of the email that will be sent, shown inside a confirm dialog. */
export function EmailPreview({ to, subject, body }: { to: string; subject: string; body: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="space-y-0.5 border-b border-line bg-canvas px-3.5 py-2.5 text-[12.5px]">
        <p><span className="text-muted">To:</span> <span className="font-medium">{to}</span></p>
        <p><span className="text-muted">Subject:</span> <span className="font-medium">{subject}</span></p>
      </div>
      <p className="px-3.5 py-3 text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{body}</p>
    </div>
  );
}
