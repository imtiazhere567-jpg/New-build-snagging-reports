"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const PAGE_SIZE = 5;

/**
 * Renders a list 5 items at a time with pagination underneath.
 * Pagination only appears when there are more than 5 items.
 * Give it a `key` that changes when the underlying list changes to reset to page 1.
 */
export function Paginated<T>({
  items,
  render,
  pageSize = PAGE_SIZE,
  empty,
  className,
}: {
  items: T[];
  render: (item: T) => React.ReactNode;
  pageSize?: number;
  empty?: React.ReactNode;
  className?: string;
}) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);

  if (!items.length) return <>{empty}</>;

  return (
    <div>
      <div className={className}>{slice.map(render)}</div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-muted tabular">
            {start + 1}–{Math.min(start + pageSize, items.length)} of {items.length}
          </p>
          <div className="flex items-center gap-1">
            <PageBtn disabled={current === 1} onClick={() => setPage(current - 1)} label="Previous page">
              <ChevronLeft className="size-4" />
            </PageBtn>
            {pageList(current, pages).map((p, i) =>
              p === "…" ? (
                <span key={`gap${i}`} className="w-6 text-center text-[13px] text-faint">…</span>
              ) : (
                <PageBtn key={p} active={p === current} onClick={() => setPage(p)} label={`Page ${p}`}>
                  {p}
                </PageBtn>
              ),
            )}
            <PageBtn disabled={current === pages} onClick={() => setPage(current + 1)} label="Next page">
              <ChevronRight className="size-4" />
            </PageBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current, current - 1, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

function PageBtn({
  children,
  onClick,
  disabled,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[13px] font-medium tabular transition-colors disabled:opacity-35",
        active ? "bg-ink text-white" : "text-ink-2 border border-line hover:bg-sunken",
      )}
    >
      {children}
    </button>
  );
}
