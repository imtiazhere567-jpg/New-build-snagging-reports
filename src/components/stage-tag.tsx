"use client";

import { cn } from "@/lib/utils";

export function StageTag({ stage }: { stage: string }) {
  const tone: Record<string, string> = {
    "New report": "bg-highlight/40 text-ink ring-[#c4dc55]",
    "Quote sent": "bg-indigo-50 text-indigo-700 ring-indigo-200",
    "In progress": "bg-amber-50 text-amber-800 ring-amber-200",
    Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "Waiting for snags": "bg-sky-50 text-sky-700 ring-sky-200",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset whitespace-nowrap", tone[stage])}>{stage}</span>
  );
}
