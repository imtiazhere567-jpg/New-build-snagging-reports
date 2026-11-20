"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Calculator, Info, Percent, PoundSterling, RotateCcw, Save, Search, SlidersHorizontal, X } from "lucide-react";
import { PageHeader } from "@/components/shell/contractor-shell";
import { Button, Card, SeverityBadge } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Dropdown } from "@/components/ui/dropdown";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/data/store";
import { DEFAULT_RATE_CARD, ratePrice, type RateRow } from "@/lib/rate-card";
import { SEVERITIES, SEVERITY_META } from "@/lib/constants";
import type { Category, Severity } from "@/lib/types";
import { cn, formatDate, formatGBP } from "@/lib/utils";

const clone = (rows: RateRow[]) => rows.map((r) => ({ ...r, prices: { ...r.prices } }));
const defaultPrice = (c: Category, s: Severity) => ratePrice(DEFAULT_RATE_CARD, c, s);

export default function RateCardPage() {
  const saved = useStore((s) => s.rateCard);
  const updatedAt = useStore((s) => s.rateCardUpdatedAt);
  const snags = useStore((s) => s.snags);
  const reports = useStore((s) => s.reports);
  const properties = useStore((s) => s.properties);
  const vatRate = useStore((s) => s.settings.vatRate);
  const saveRateCard = useStore((s) => s.saveRateCard);
  const resetRateCard = useStore((s) => s.resetRateCard);

  const [draft, setDraft] = useState<RateRow[]>(() => clone(saved));
  const [q, setQ] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const savedPrice = (c: Category, s: Severity) => ratePrice(saved, c, s);
  const unsaved = draft.reduce((n, r) => n + SEVERITIES.filter((s) => r.prices[s] !== savedPrice(r.category, s)).length, 0);
  const fromDefault = saved.reduce((n, r) => n + SEVERITIES.filter((s) => r.prices[s] !== defaultPrice(r.category, s)).length, 0);
  const usage = useMemo(() => {
    const m = new Map<Category, number>();
    snags.forEach((s) => m.set(s.category, (m.get(s.category) ?? 0) + 1));
    return m;
  }, [snags]);

  const term = q.trim().toLowerCase();
  const rows = draft.filter((r) => !term || r.category.toLowerCase().includes(term));

  const setPrice = (c: Category, s: Severity, v: number) =>
    setDraft((d) => d.map((r) => (r.category === c ? { ...r, prices: { ...r.prices, [s]: Math.max(0, Math.round(v)) } } : r)));

  const save = () => {
    saveRateCard(draft);
    toast({ title: "Rate card saved", body: `${unsaved} ${unsaved === 1 ? "price" : "prices"} updated. New quotes will use these prices.` });
  };

  return (
    <div className="animate-fade-up pb-24">
      <PageHeader
        title="Rate card"
        description="Your standard prices for each type of repair. Every new quote is filled in from here; quotes already sent never change."
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(true)} disabled={fromDefault === 0 && unsaved === 0}>
              <RotateCcw className="size-4" /> Reset to default
            </Button>
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>
              <SlidersHorizontal className="size-4" /> Bulk adjust
            </Button>
          </>
        }
      />

      {/* Status strip */}
      <div className="mb-5 flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="rounded-full border border-line bg-surface px-3 py-1 text-ink-2">{draft.length} categories × 4 severities</span>
        <span className="rounded-full border border-line bg-surface px-3 py-1 text-ink-2">Prices exclude VAT ({Math.round(vatRate * 100)}% added on quotes)</span>
        <span className={cn("rounded-full border px-3 py-1", updatedAt ? "border-brand-200 bg-brand-50 text-brand-800" : "border-line bg-surface text-muted")}>
          {updatedAt ? `Last saved ${formatDate(updatedAt)} · ${fromDefault} changed from default` : "Using default prices"}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---------- Price table ---------- */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find a category, e.g. Tiling"
                aria-label="Search categories"
                className="h-9 w-full rounded-xl border border-transparent bg-canvas pr-8 pl-9 text-[13.5px] outline-none placeholder:text-faint focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-500/15"
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 p-0.5 text-faint hover:text-ink" aria-label="Clear search">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <p className="flex items-center gap-3 text-[12px] text-muted">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-500" /> Unsaved</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-faint" /> Differs from default</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-line bg-canvas">
                  <th className="px-4 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Category</th>
                  {SEVERITIES.map((s) => (
                    <th key={s} className="px-2 py-2.5 text-right">
                      <span className="inline-flex"><SeverityBadge severity={s} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted">No category matches “{q}”.</td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.category} className="transition-colors hover:bg-canvas/70">
                    <td className="px-4 py-2">
                      <p className="font-medium">{r.category}</p>
                      <p className="text-[11.5px] text-faint">{usage.get(r.category) ? `${usage.get(r.category)} snags so far` : "Not used yet"}</p>
                    </td>
                    {SEVERITIES.map((s) => {
                      const v = r.prices[s];
                      const isUnsaved = v !== savedPrice(r.category, s);
                      const isCustom = v !== defaultPrice(r.category, s);
                      return (
                        <td key={s} className="px-2 py-2 text-right">
                          <div className="relative ml-auto w-[96px]">
                            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[12.5px] text-muted">£</span>
                            <input
                              type="number"
                              min={0}
                              step={5}
                              value={v}
                              onChange={(e) => setPrice(r.category, s, Number(e.target.value))}
                              aria-label={`${r.category}, ${SEVERITY_META[s].label} price`}
                              title={isCustom ? `Default is ${formatGBP(defaultPrice(r.category, s))}` : "Default price"}
                              className={cn(
                                "h-9 w-full rounded-lg border bg-surface pr-6 pl-6 text-right text-[13.5px] font-medium tabular outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15",
                                isUnsaved ? "border-brand-400 bg-brand-50/60" : "border-line-strong",
                              )}
                            />
                            {(isUnsaved || isCustom) && (
                              <span
                                className={cn(
                                  "pointer-events-none absolute top-1/2 right-2 size-1.5 -translate-y-1/2 rounded-full",
                                  isUnsaved ? "bg-brand-500" : "border border-faint",
                                )}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ---------- Side panel ---------- */}
        <div className="flex flex-col gap-6 xl:sticky xl:top-20 xl:self-start">
          <QuotePreview draft={draft} saved={saved} snags={snags} reports={reports} properties={properties} vatRate={vatRate} />
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold"><Info className="size-4 text-brand-600" /> How prices are used</h3>
            <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-2">
              <li>• When you start a quote, each snag is priced by its <b>category</b> and <b>severity</b>.</li>
              <li>• You can still change any single price on a quote before sending it.</li>
              <li>• VAT is added on the quote; prices here are always ex VAT.</li>
              <li>• Saving only affects <b>new</b> quotes. Sent quotes keep the price the owner saw.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Unsaved changes bar */}
      {unsaved > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-64">
          <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-night px-4 py-3 text-white shadow-2xl animate-fade-up">
            <span className="size-2 shrink-0 rounded-full bg-highlight" />
            <p className="flex-1 text-[13.5px]">
              <b className="font-semibold">{unsaved}</b> unsaved {unsaved === 1 ? "change" : "changes"}
            </p>
            <button onClick={() => setDraft(clone(saved))} className="h-9 rounded-xl px-3 text-[13px] font-medium text-white/70 hover:bg-white/10 hover:text-white">
              Discard
            </button>
            <Button onClick={save} className="bg-highlight text-night hover:bg-[#cbe55c]">
              <Save className="size-4" /> Save rate card
            </Button>
          </div>
        </div>
      )}

      {bulkOpen && (
        <BulkAdjust
          draft={draft}
          onClose={() => setBulkOpen(false)}
          onApply={(next, count) => {
            setDraft(next);
            setBulkOpen(false);
            toast({ title: `${count} prices adjusted`, body: "Review them, then press Save rate card to keep the changes.", tone: "info" });
          }}
        />
      )}

      <ConfirmDialog
        open={confirmReset}
        icon={<RotateCcw className="size-5" />}
        title="Reset every price to the default?"
        description={`${fromDefault} saved ${fromDefault === 1 ? "price differs" : "prices differ"} from the defaults. Quotes already sent are not affected.`}
        confirmLabel="Reset to default"
        confirmIcon={<RotateCcw className="size-4" />}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetRateCard();
          setDraft(clone(DEFAULT_RATE_CARD));
          setConfirmReset(false);
          toast({ title: "Rate card reset", body: "All prices are back to the defaults." });
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Live preview: what a real report would cost with saved vs draft   */
/* ---------------------------------------------------------------- */

function QuotePreview({
  draft,
  saved,
  snags,
  reports,
  properties,
  vatRate,
}: {
  draft: RateRow[];
  saved: RateRow[];
  snags: ReturnType<typeof useStore.getState>["snags"];
  reports: ReturnType<typeof useStore.getState>["reports"];
  properties: ReturnType<typeof useStore.getState>["properties"];
  vatRate: number;
}) {
  const options = reports
    .filter((r) => r.status !== "draft")
    .map((r) => ({ r, p: properties.find((x) => x.id === r.propertyId)!, n: snags.filter((s) => s.reportId === r.id).length }))
    .sort((a, b) => (a.r.status === "submitted" ? -1 : 0) - (b.r.status === "submitted" ? -1 : 0) || b.n - a.n);
  const [reportId, setReportId] = useState(options[0]?.r.id ?? "");
  const list = snags.filter((s) => s.reportId === reportId);
  const total = (card: RateRow[]) => list.reduce((a, s) => a + ratePrice(card, s.category, s.severity), 0) * (1 + vatRate);
  const before = total(saved);
  const after = total(draft);
  const diff = after - before;

  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 text-[14px] font-semibold"><Calculator className="size-4 text-brand-600" /> Quote preview</h3>
      <p className="mt-1 text-[12.5px] text-muted">See what a real report would cost with these prices.</p>
      <div className="mt-3">
        <Dropdown
          label="Report"
          value={reportId}
          onChange={setReportId}
          menuWidth={300}
          options={options.map(({ r, p, n }) => ({ value: r.id, label: `${p.addressLine1}, ${p.town}`, hint: `${n} snags${r.status === "submitted" ? " · needs a quote" : ""}` }))}
        />
      </div>
      <div className="mt-4 rounded-xl bg-canvas p-4">
        <div className="flex items-center justify-between text-[12.5px] text-muted">
          <span>{list.length} snags · inc. VAT</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={cn("text-[15px] tabular", Math.abs(diff) > 0.005 ? "text-muted line-through" : "font-semibold text-ink")}>{formatGBP(before)}</span>
          {Math.abs(diff) > 0.005 && (
            <>
              <ArrowRight className="size-4 text-faint" />
              <span className="text-[20px] font-semibold tabular">{formatGBP(after)}</span>
            </>
          )}
        </div>
        <p className={cn("mt-1 text-[12.5px] font-medium", diff > 0.005 ? "text-emerald-700" : diff < -0.005 ? "text-orange-700" : "text-muted")}>
          {Math.abs(diff) > 0.005 ? `${diff > 0 ? "+" : "−"}${formatGBP(Math.abs(diff))} with your unsaved changes` : "No unsaved changes"}
        </p>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* Bulk adjust popup                                                 */
/* ---------------------------------------------------------------- */

function BulkAdjust({ draft, onClose, onApply }: { draft: RateRow[]; onClose: () => void; onApply: (rows: RateRow[], count: number) => void }) {
  const [category, setCategory] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState(10);
  const [round5, setRound5] = useState(true);

  const adjust = (v: number) => {
    const raw = mode === "percent" ? v * (1 + value / 100) : v + value;
    return Math.max(0, round5 ? Math.round(raw / 5) * 5 : Math.round(raw));
  };
  const hits = draft.flatMap((r) =>
    SEVERITIES.filter((s) => (category === "all" || r.category === category) && (severity === "all" || s === severity)).map((s) => ({ r, s })),
  );
  const changed = hits.filter(({ r, s }) => adjust(r.prices[s]) !== r.prices[s]);
  const example = hits[0];

  const apply = () => {
    const next = draft.map((r) => ({
      ...r,
      prices: Object.fromEntries(
        SEVERITIES.map((s) => [s, (category === "all" || r.category === category) && (severity === "all" || s === severity) ? adjust(r.prices[s]) : r.prices[s]]),
      ) as RateRow["prices"],
    }));
    onApply(next, changed.length);
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={<SlidersHorizontal className="size-5" />}
      title="Bulk adjust prices"
      description="Raise or lower many prices at once. Changes go into your draft; nothing is saved until you press Save."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={apply} disabled={changed.length === 0}>Apply to {changed.length} {changed.length === 1 ? "price" : "prices"}</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink-2">Categories</p>
          <Dropdown
            label="Categories"
            value={category}
            onChange={setCategory}
            menuWidth={260}
            options={[{ value: "all", label: "All categories" }, ...draft.map((r) => ({ value: r.category, label: r.category }))]}
          />
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink-2">Severity</p>
          <Dropdown
            label="Severity"
            value={severity}
            onChange={setSeverity}
            align="right"
            options={[{ value: "all", label: "All severities" }, ...SEVERITIES.map((s) => ({ value: s, label: SEVERITY_META[s].label }))]}
          />
        </div>
      </div>

      <p className="mt-4 mb-1.5 text-[13px] font-medium text-ink-2">Change by</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line-strong bg-surface p-0.5">
          {(
            [
              ["percent", "Percent", Percent],
              ["amount", "Pounds", PoundSterling],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              aria-pressed={mode === k}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium", mode === k ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken")}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label="Adjustment amount"
            className="h-9 w-28 rounded-xl border border-line-strong bg-surface pr-8 pl-3 text-right text-[14px] font-semibold tabular outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted">{mode === "percent" ? "%" : "£"}</span>
        </div>
        <div className="flex gap-1">
          {(mode === "percent" ? [-10, 5, 10] : [-5, 5, 10]).map((v) => (
            <button key={v} onClick={() => setValue(v)} className="h-8 rounded-lg border border-line px-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-sunken">
              {v > 0 ? "+" : ""}{v}{mode === "percent" ? "%" : ""}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-[12px] text-muted">Use a negative number to lower prices.</p>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" checked={round5} onChange={(e) => setRound5(e.target.checked)} className="size-4 accent-brand-600" />
        Round to the nearest £5
      </label>

      <div className="mt-4 rounded-xl border border-line bg-canvas p-3.5 text-[13px]">
        <p className="font-medium">{changed.length} of {hits.length} selected prices will change</p>
        {example && (
          <p className="mt-1 text-muted">
            e.g. {example.r.category}, {SEVERITY_META[example.s].label}: {formatGBP(example.r.prices[example.s])} → <b className="text-ink">{formatGBP(adjust(example.r.prices[example.s]))}</b>
          </p>
        )}
      </div>
    </Modal>
  );
}
