"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const noop = () => () => {};
/** True only in the browser (portals need document.body). */
function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

// Shared body scroll lock across stacked overlays.
let locks = 0;
function lockScroll() {
  locks += 1;
  if (locks === 1) document.documentElement.style.overflow = "hidden";
  return () => {
    locks -= 1;
    if (locks === 0) document.documentElement.style.overflow = "";
  };
}

function useOverlay(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // Only the top-most overlay reacts to Escape.
      const all = document.querySelectorAll("[data-overlay]");
      if (e.key === "Escape" && all[all.length - 1] === panelRef.current) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlock();
      prev?.focus?.();
    };
  }, [open]);
  return panelRef;
}

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: "md" | "lg";
}

/** Centred dialog. On phones it becomes a bottom sheet. */
export function Modal({ open, onClose, title, description, icon, footer, children, size = "md" }: OverlayProps) {
  const isClient = useIsClient();
  const panelRef = useOverlay(open, onClose);
  const titleId = useId();
  if (!isClient || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-[fade-in_0.2s_ease-out]" onClick={onClose} />
      <div
        ref={panelRef}
        data-overlay
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl border border-line outline-none animate-fade-up sm:rounded-3xl",
          size === "md" ? "sm:max-w-xl" : "sm:max-w-3xl",
        )}
      >
        <OverlayHeader titleId={titleId} title={title} description={description} icon={icon} onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-5 pt-1 pb-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas px-5 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Right-hand side sheet for full details. Stacks above modals. */
export function Drawer({ open, onClose, title, description, icon, footer, children, size }: Omit<OverlayProps, "size"> & { size?: "md" | "xl" }) {
  const isClient = useIsClient();
  const panelRef = useOverlay(open, onClose);
  const titleId = useId();
  if (!isClient || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-ink/30 animate-[fade-in_0.2s_ease-out]" onClick={onClose} />
      <div
        ref={panelRef}
        data-overlay
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn("relative flex h-full w-full flex-col", size === "xl" ? "max-w-[1080px]" : "max-w-[560px]", " bg-surface shadow-2xl outline-none animate-[slide-in_0.32s_cubic-bezier(0.2,0.7,0.2,1)]")}
      >
        <OverlayHeader titleId={titleId} title={title} description={description} icon={icon} onClose={onClose} bordered />
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas px-5 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

function OverlayHeader({
  titleId,
  title,
  description,
  icon,
  onClose,
  bordered,
}: {
  titleId: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  bordered?: boolean;
}) {
  return (
    <div className={cn("flex items-start gap-3 px-5 pt-5 pb-4 sm:px-6", bordered && "border-b border-line")}>
      {icon && <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-ink-2">{icon}</div>}
      <div className="min-w-0 flex-1 pt-0.5">
        <h2 id={titleId} className="text-[17px] leading-snug font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      <button onClick={onClose} className="-mr-1.5 rounded-lg p-1.5 text-muted hover:bg-sunken hover:text-ink" aria-label="Close">
        <X className="size-5" />
      </button>
    </div>
  );
}
