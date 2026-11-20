"use client";

import { create } from "zustand";
import { CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  title: string;
  body?: string;
  tone: "success" | "info";
}

interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, "id" | "tone"> & { tone?: ToastItem["tone"] }) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: ({ title, body, tone = "success" }) => {
    const id = ++seq;
    set({ items: [...get().items, { id, title, body, tone }].slice(-3) });
    window.setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

/** Show a confirmation message from anywhere: toast({ title, body }). */
export const toast = (t: Parameters<ToastState["push"]>[0]) => useToastStore.getState().push(t);

/** Mount once per shell. Messages stack in the top-right corner (top-centre on phones), above popups. */
export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end sm:px-0">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-md items-start sm:w-[380px] gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-2xl animate-fade-up"
        >
          {t.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-highlight" />
          ) : (
            <Info className="mt-0.5 size-5 shrink-0 text-sky-300" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold">{t.title}</p>
            {t.body && <p className={cn("mt-0.5 text-[12.5px] leading-snug text-white/65")}>{t.body}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="-mr-1 rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
