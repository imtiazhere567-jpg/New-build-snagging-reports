"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronRight, FileText, Inbox, Search, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/shell/contractor-shell";
import { Avatar, Card, Ring } from "@/components/ui/primitives";
import { Paginated } from "@/components/ui/pagination";
import { Dropdown } from "@/components/ui/dropdown";
import { QuoteAction } from "@/components/contractor/quote-action";
import { DashboardDrawer, type DrawerView } from "@/components/contractor/dashboard-overlays";
import { useStore } from "@/lib/data/store";
import { propertyProgress, quoteTotals } from "@/lib/data/queries";
import { SEVERITIES, SEVERITY_META } from "@/lib/constants";
import type { Report, ReportStatus } from "@/lib/types";
import { cn, formatDate, formatGBP, timeAgo } from "@/lib/utils";

const TABS: { key: ReportStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Needs quote" },
  { key: "quoted", label: "Quote sent" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

const STATUS_STYLE: Record<ReportStatus, { label: string; cls: string; dot: string }> = {
  draft: { label: "Draft", cls: "bg-zinc-100 text-zinc-600 border-zinc-200", dot: "bg-zinc-400" },
  submitted: { label: "Needs quote", cls: "bg-highlight/35 text-ink border-[#c4dc55]", dot: "bg-[#8fae16]" },
  quoted: { label: "Quote sent", cls: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  in_progress: { label: "In progress", cls: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-600" },
};

type Sort = "newest" | "oldest" | "items" | "urgent";

export default function ReportsPage() {
  const state = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [drawer, setDrawer] = useState<DrawerView | null>(null);
  const [now] = useState(() => Date.now());

  const rows = useMemo(
    () =>
      state.reports.filter((r) => r.status !== "draft").map((r) => {
        const property = state.properties.find((p) => p.id === r.propertyId)!;
        const owner = state.users.find((u) => u.id === property.ownerId)!;
        const snags = state.snags.filter((s) => s.reportId === r.id);
        const quote = state.quotes.find((x) => x.reportId === r.id);
        const urgent = snags.filter((s) => s.severity === "safety" || s.severity === "major").length;
        return { r, property, owner, snags, quote, urgent, progress: propertyProgress(snags) };
      }),
    [state],
  );

  const counts = Object.fromEntries(TABS.map((t) => [t.key, t.key === "all" ? rows.length : rows.filter((x) => x.r.status === t.key).length]));

  const term = q.trim().toLowerCase();
  const filtered = rows
    .filter((x) => tab === "all" || x.r.status === tab)
    .filter(
      (x) =>
        !term ||
        [x.property.addressLine1, x.property.town, x.property.postcode, x.property.development, x.owner.name, x.quote?.number]
          .some((v) => v?.toLowerCase().includes(term)),
    )
    .sort((a, b) => {
      const da = a.r.submittedAt ?? a.r.createdAt;
      const db = b.r.submittedAt ?? b.r.createdAt;
      if (sort === "oldest") return da.localeCompare(db);
      if (sort === "items") return b.snags.length - a.snags.length;
      if (sort === "urgent") return b.urgent - a.urgent;
      return db.localeCompare(da);
    });

  // KPIs
  const monthAgo = now - 30 * 86_400_000;
  const thisMonth = rows.filter((x) => new Date(x.r.submittedAt ?? x.r.createdAt).getTime() >= monthAgo).length;
  const awaitingQuote = rows.filter((x) => x.r.status === "submitted");
  const sentValue = rows.filter((x) => x.quote?.status === "sent").reduce((a, x) => a + quoteTotals(x.quote!).gross, 0);
  const totalItems = rows.reduce((a, x) => a + x.snags.length, 0);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Reports" description="Every snag report sent in by your home owners, from first submission to final sign-off." />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Needs a quote" value={awaitingQuote.length} sub={awaitingQuote.length ? `Oldest ${timeAgo(awaitingQuote.at(-1)!.r.submittedAt!)}` : "All caught up"} dark />
        <Kpi label="Received in 30 days" value={thisMonth} sub={`${rows.length} reports in total`} />
        <Kpi label="Quotes awaiting reply" value={formatGBP(sentValue)} sub={`${rows.filter((x) => x.quote?.status === "sent").length} sent, not yet accepted`} />
        <Kpi label="Snags reported" value={totalItems} sub={`${(totalItems / Math.max(1, rows.length)).toFixed(1)} per home on average`} />
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[13px] font-medium transition-colors",
                tab === t.key ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken",
              )}
            >
              {t.label}
              <span className={cn("rounded-md px-1.5 text-[11.5px] tabular", tab === t.key ? "bg-white/15" : "bg-sunken text-muted")}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 lg:ml-auto">
          <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Address, owner or quote no."
              aria-label="Search reports"
              className="h-9 w-full rounded-xl border border-line-strong bg-surface pr-8 pl-9 text-[13.5px] outline-none placeholder:text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 p-0.5 text-faint hover:text-ink" aria-label="Clear search">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Dropdown
            label="Sort by"
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            size="sm"
            align="right"
            menuWidth={200}
            icon={<ArrowUpDown className="size-3.5" />}
            className="w-[150px] shrink-0"
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "urgent", label: "Most urgent", hint: "Safety & major items" },
              { value: "items", label: "Most items" },
            ]}
          />
        </div>
      </div>

      {/* Table header (desktop) */}
      <div className="mt-4 hidden grid-cols-[minmax(0,2.3fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1fr)_170px] gap-4 px-5 pb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-faint lg:grid">
        <span>Home</span>
        <span>Snags</span>
        <span>Quote</span>
        <span>Progress</span>
        <span className="text-right">Action</span>
      </div>

      <Paginated
        key={`${tab}|${term}|${sort}`}
        items={filtered}
        pageSize={6}
        className="space-y-2.5 lg:space-y-2"
        empty={
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-blueprint px-6 py-16 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-muted"><Inbox className="size-5" /></span>
            <p className="mt-3 font-medium">No reports here</p>
            <p className="mt-1 text-[13px] text-muted">{term ? `Nothing matches “${q}”.` : "Reports appear when home owners submit their snag lists."}</p>
          </div>
        }
        render={(x) => <ReportRow key={x.r.id} {...x} onOpen={() => setDrawer({ kind: "report", id: x.r.id })} />}
      />

      <DashboardDrawer view={drawer} onClose={() => setDrawer(null)} openDrawer={setDrawer} />
    </div>
  );
}

function Kpi({ label, value, sub, dark }: { label: string; value: string | number; sub: string; dark?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-4 sm:p-5", dark ? "bg-night text-white" : "border border-line bg-surface shadow-card")}>
      <p className={cn("text-[12.5px] font-medium", dark ? "text-white/60" : "text-muted")}>{label}</p>
      <p className="mt-2.5 text-[26px] font-semibold tracking-tight tabular">{value}</p>
      <p className={cn("mt-0.5 truncate text-[12.5px]", dark ? "text-white/50" : "text-muted")}>{sub}</p>
    </div>
  );
}

function ReportRow({
  r,
  property,
  owner,
  snags,
  quote,
  progress,
  onOpen,
}: {
  r: Report;
  property: ReturnType<typeof useStore.getState>["properties"][number];
  owner: ReturnType<typeof useStore.getState>["users"][number];
  snags: ReturnType<typeof useStore.getState>["snags"];
  quote?: ReturnType<typeof useStore.getState>["quotes"][number];
  progress: { total: number; verified: number; percent: number };
  onOpen: () => void;
}) {
  const st = STATUS_STYLE[r.status];
  const quoteLabel = quote
    ? { sent: "Awaiting reply", accepted: "Accepted", partially_accepted: "Partly accepted", declined: "Declined", draft: "Draft" }[quote.status]
    : null;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lift">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open report for ${property.addressLine1}, ${property.town}`}
        onClick={onOpen}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
        className="grid cursor-pointer grid-cols-[minmax(0,1fr)] gap-4 p-4 outline-none focus-visible:bg-canvas sm:p-5 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1fr)_170px] lg:items-center"
      >
        {/* Home */}
        <div className="flex min-w-0 items-center gap-3.5">
          <div
            className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl"
            style={{ background: `linear-gradient(135deg, hsl(${property.coverHue} 35% 88%), hsl(${property.coverHue} 30% 74%))` }}
          >
            <FileText className="size-5 text-white/90" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[14.5px] font-semibold tracking-tight">{property.addressLine1}, {property.town}</p>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-muted">
              <Avatar user={owner} size={16} /> {owner.name}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", st.cls)}>
                <span className={cn("size-1.5 rounded-full", st.dot)} /> {st.label}
              </span>
              <span className="text-[11.5px] text-faint">v{r.version} · {formatDate(r.submittedAt ?? r.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Snags */}
        <div className="min-w-0">
          <p className="text-[13px]">
            <span className="font-semibold tabular">{snags.length}</span> <span className="text-muted">items</span>
          </p>
          <div className="mt-1.5 flex h-1.5 max-w-[220px] overflow-hidden rounded-full bg-sunken">
            {SEVERITIES.map((sev) => {
              const n = snags.filter((s) => s.severity === sev).length;
              return n ? <div key={sev} className={SEVERITY_META[sev].dot} style={{ width: `${(n / snags.length) * 100}%` }} /> : null;
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
            {SEVERITIES.map((sev) => {
              const n = snags.filter((s) => s.severity === sev).length;
              return n ? (
                <span key={sev} className="inline-flex items-center gap-1 text-[11.5px] text-muted">
                  <span className={cn("size-1.5 rounded-full", SEVERITY_META[sev].dot)} /> {n} {SEVERITY_META[sev].label.toLowerCase()}
                </span>
              ) : null;
            })}
          </div>
        </div>

        {/* Quote */}
        <div className="min-w-0">
          {quote ? (
            <>
              <p className="text-[13.5px] font-semibold tabular">{formatGBP(quoteTotals(quote).gross)}</p>
              <p className="truncate text-[12px] text-muted">{quote.number} · {quoteLabel}</p>
            </>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
              <Sparkles className="size-3.5 text-brand-500" /> Ready to price
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2.5">
          <Ring value={progress.percent} size={38} stroke={4} />
          <div className="text-[12px] leading-tight">
            <p className="font-medium tabular">{progress.verified}/{progress.total}</p>
            <p className="text-muted">verified</p>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center gap-2 lg:justify-end" onClick={(e) => e.stopPropagation()}>
          <QuoteAction reportId={r.id} size="sm" />
          <button onClick={onOpen} className="rounded-lg p-1.5 text-faint transition-colors hover:bg-sunken hover:text-ink" aria-label="Open report">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
