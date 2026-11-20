import { Construction } from "lucide-react";

export function ComingSoon({ phase, title, items }: { phase: number; title: string; items: string[] }) {
  return (
    <div className="animate-fade-up">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-blueprint p-8 sm:p-12">
        <div className="flex size-11 items-center justify-center rounded-xl bg-surface text-brand-600 border border-line">
          <Construction className="size-5" />
        </div>
        <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-brand-600">Arriving in phase {phase}</p>
        <ul className="mt-3 space-y-1.5 text-[14px] text-ink-2">
          {items.map((i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
              {i}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
