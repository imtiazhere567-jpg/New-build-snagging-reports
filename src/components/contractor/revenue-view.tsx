"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Building2, CalendarDays, CreditCard, Download, Home, Minus, X } from "lucide-react";
import { Avatar, Button, Card } from "@/components/ui/primitives";
import { Paginated } from "@/components/ui/pagination";
import { Dropdown } from "@/components/ui/dropdown";
import { useStore } from "@/lib/data/store";
import { quoteTotals } from "@/lib/data/queries";
import { cn, formatGBP } from "@/lib/utils";

/*
 * Chart colours, validated with the dataviz palette checker against the white card surface:
 * lightness band, chroma floor, CVD separation (ΔE 22.0), normal-vision floor (ΔE 27.8), contrast ≥ 3:1. All pass.
 */
const SERIES = [
  { key: "deposit", label: "Deposits", color: "#00936f" },
  { key: "balance", label: "Balances", color: "#6250d6" },
] as const;

const gbp0 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

type Period = "3" | "6" | "12" | "ytd";

interface MonthRow {
  key: string; // yyyy-mm
  label: string; // "Nov"
  long: string; // "November 2026"
  deposit: number;
  balance: number;
  total: number;
  count: number;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Revenue history: monthly collected (deposits vs balances), month table and revenue by job. */
export function RevenueView({ onOpenInvoice }: { onOpenInvoice: (id: string) => void }) {
  const payments = useStore((s) => s.payments);
  const invoices = useStore((s) => s.invoices);
  const quotes = useStore((s) => s.quotes);
  const properties = useStore((s) => s.properties);
  const users = useStore((s) => s.users);
  const [period, setPeriod] = useState<Period>("12");
  const [development, setDevelopment] = useState("all");
  const [propertyId, setPropertyId] = useState("all");
  const [kind, setKind] = useState<"all" | "deposit" | "balance">("all");
  const [now] = useState(() => new Date());

  const range = period === "ytd" ? now.getMonth() + 1 : Number(period);
  const periodLabel = period === "ytd" ? "this year" : `last ${period} months`;

  // Which homes are in scope (development first, then a single home)
  const developments = useMemo(() => [...new Set(properties.map((p) => p.development))].sort(), [properties]);
  const homesInDev = useMemo(
    () => properties.filter((p) => development === "all" || p.development === development),
    [properties, development],
  );
  const inScope = (pid: string) =>
    (development === "all" || properties.find((p) => p.id === pid)?.development === development) && (propertyId === "all" || pid === propertyId);
  const kindOf = (invoiceId: string) => invoices.find((i) => i.id === invoiceId)?.kind ?? "deposit";
  const scopedPayments = payments.filter((p) => inScope(p.propertyId) && (kind === "all" || kindOf(p.invoiceId) === kind));
  const filtersOn = period !== "12" || development !== "all" || propertyId !== "all" || kind !== "all";
  const series = SERIES.filter((s) => kind === "all" || s.key === kind);

  const months: MonthRow[] = useMemo(() => {
    const rows: MonthRow[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      rows.push({
        key: monthKey(d),
        label: d.toLocaleDateString("en-GB", { month: "short" }),
        long: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        deposit: 0,
        balance: 0,
        total: 0,
        count: 0,
      });
    }
    const byKey = new Map(rows.map((r) => [r.key, r]));
    for (const p of scopedPayments) {
      const row = byKey.get(monthKey(new Date(p.paidAt)));
      if (!row) continue;
      const k = invoices.find((i) => i.id === p.invoiceId)?.kind ?? "deposit";
      row[k] += p.amount;
      row.total += p.amount;
      row.count += 1;
    }
    return rows;
  }, [scopedPayments, invoices, range, now]);

  const total = months.reduce((a, m) => a + m.total, 0);
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const delta = lastMonth && lastMonth.total > 0 ? (thisMonth.total - lastMonth.total) / lastMonth.total : null;
  const best = months.reduce((a, m) => (m.total > a.total ? m : a), months[0]);

  /* Revenue per job (quote) */
  const jobs = useMemo(
    () =>
      quotes
        .filter((q) => (q.status === "accepted" || q.status === "partially_accepted") && inScope(q.propertyId))
        .map((q) => {
          const p = properties.find((x) => x.id === q.propertyId);
          const owner = users.find((u) => u.id === p?.ownerId);
          const inv = invoices.filter((i) => i.quoteId === q.id);
          const paid = payments.filter((x) => inv.some((i) => i.id === x.invoiceId)).reduce((a, x) => a + x.amount, 0);
          const value = quoteTotals(q).gross;
          const lastPaid = payments
            .filter((x) => inv.some((i) => i.id === x.invoiceId))
            .map((x) => x.paidAt)
            .sort()
            .at(-1);
          return { q, p, owner, inv, paid, value, outstanding: Math.max(0, value - paid), lastPaid };
        })
        .sort((a, b) => (b.lastPaid ?? "").localeCompare(a.lastPaid ?? "")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quotes, properties, users, invoices, payments, development, propertyId],
  );
  const avgJob = jobs.length ? jobs.reduce((a, j) => a + j.value, 0) / jobs.length : 0;

  const exportCsv = () => {
    const rows = [["Month", "Deposits", "Balances", "Total", "Payments"], ...months.map((m) => [m.long, m.deposit.toFixed(2), m.balance.toFixed(2), m.total.toFixed(2), String(m.count)])];
    const blob = new Blob([rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `revenue-${monthKey(now)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      {/* Filters: one row above everything they scope. Date range first. */}
      <div className="rounded-2xl border border-line bg-surface p-2 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown
            label="Period"
            value={period}
            onChange={(v) => setPeriod(v as Period)}
            highlightWhenSet
            defaultValue="12"
            icon={<CalendarDays className="size-4" />}
            className="w-[calc(50%-4px)] sm:w-[180px]"
            options={[
              { value: "3", label: "Last 3 months" },
              { value: "6", label: "Last 6 months" },
              { value: "12", label: "Last 12 months" },
              { value: "ytd", label: `This year (${now.getFullYear()})` },
            ]}
          />
          <Dropdown
            label="Development"
            value={development}
            onChange={(v) => {
              setDevelopment(v);
              setPropertyId("all");
            }}
            highlightWhenSet
            icon={<Building2 className="size-4" />}
            menuWidth={240}
            className="w-[calc(50%-4px)] sm:w-[190px]"
            options={[{ value: "all", label: "All developments" }, ...developments.map((d) => ({ value: d, label: d }))]}
          />
          <Dropdown
            label="Home"
            value={propertyId}
            onChange={setPropertyId}
            highlightWhenSet
            icon={<Home className="size-4" />}
            menuWidth={300}
            className="w-[calc(50%-4px)] sm:w-[200px]"
            options={[
              { value: "all", label: development === "all" ? "All homes" : `All in ${development}` },
              ...homesInDev.map((p) => ({ value: p.id, label: `${p.addressLine1}, ${p.town}`, hint: users.find((u) => u.id === p.ownerId)?.name })),
            ]}
          />
          <Dropdown
            label="Payment type"
            value={kind}
            onChange={(v) => setKind(v as typeof kind)}
            highlightWhenSet
            icon={<CreditCard className="size-4" />}
            className="w-[calc(50%-4px)] sm:w-[170px]"
            options={[
              { value: "all", label: "All payments" },
              { value: "deposit", label: "Deposits only", leading: <span className="size-2.5 rounded-[3px]" style={{ background: SERIES[0].color }} /> },
              { value: "balance", label: "Balances only", leading: <span className="size-2.5 rounded-[3px]" style={{ background: SERIES[1].color }} /> },
            ]}
          />
          {filtersOn && (
            <button
              onClick={() => {
                setPeriod("12");
                setDevelopment("all");
                setPropertyId("all");
                setKind("all");
              }}
              className="inline-flex h-10 items-center gap-1 rounded-xl px-2.5 text-[13px] font-medium text-brand-700 hover:bg-brand-50"
            >
              <X className="size-3.5" /> Clear
            </button>
          )}
          <Button variant="secondary" size="sm" className="ml-auto" onClick={exportCsv}>
            <Download className="size-3.5" /> Export CSV
          </Button>
        </div>
        <p className="mt-2 border-t border-line px-1.5 pt-2 text-[12.5px] text-muted">
          Showing <b className="font-semibold text-ink">{kind === "all" ? "all payments" : kind === "deposit" ? "deposits" : "balances"}</b> for{" "}
          <b className="font-semibold text-ink">
            {propertyId !== "all" ? properties.find((p) => p.id === propertyId)?.addressLine1 : development !== "all" ? development : "every home"}
          </b>
          , {periodLabel}.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={`Collected, ${periodLabel}`} value={gbp0.format(total)} sub={`${months.reduce((a, m) => a + m.count, 0)} card payments`} />
        <Tile
          label={`This month (${thisMonth.label})`}
          value={gbp0.format(thisMonth.total)}
          delta={delta}
          sub={lastMonth ? `vs ${gbp0.format(lastMonth.total)} in ${lastMonth.label}` : ""}
        />
        <Tile label="Best month" value={gbp0.format(best.total)} sub={best.total ? best.long : "No payments yet"} />
        <Tile label="Average job value" value={gbp0.format(avgJob)} sub={`Across ${jobs.length} accepted quotes`} />
      </div>

      {/* Chart */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">Money collected per month</h3>
            <p className="mt-0.5 text-[12.5px] text-muted">Card payments received, split into deposits and final balances (inc. VAT).</p>
          </div>
          <ul className="flex items-center gap-4" aria-label="Legend">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} /> {s.label}
              </li>
            ))}
          </ul>
        </div>
        {total === 0 ? (
          <div className="mt-4 flex h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-blueprint text-center">
            <p className="font-medium">No payments in this selection</p>
            <p className="mt-1 text-[13px] text-muted">Try a longer period or a different home.</p>
          </div>
        ) : (
          <RevenueChart months={months} best={best.key} series={series} />
        )}
      </Card>

      {/* Month table (also the chart's table view) */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="text-[15px] font-semibold tracking-tight">Month by month</h3>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-[11.5px] uppercase tracking-[0.08em] text-muted">
              <th className="px-5 py-2.5 font-semibold">Month</th>
              <th className="px-3 py-2.5 text-right font-semibold">Deposits</th>
              <th className="px-3 py-2.5 text-right font-semibold">Balances</th>
              <th className="px-3 py-2.5 text-right font-semibold">Total</th>
              <th className="hidden px-5 py-2.5 text-right font-semibold sm:table-cell">Payments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...months].reverse().map((m) => (
              <tr key={m.key} className={cn(m.total === 0 && "text-faint")}>
                <td className="px-5 py-2.5 font-medium">{m.long}</td>
                <td className="px-3 py-2.5 text-right tabular">{m.deposit ? formatGBP(m.deposit) : "–"}</td>
                <td className="px-3 py-2.5 text-right tabular">{m.balance ? formatGBP(m.balance) : "–"}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular">{m.total ? formatGBP(m.total) : "–"}</td>
                <td className="hidden px-5 py-2.5 text-right tabular sm:table-cell">{m.count || "–"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-canvas font-semibold">
              <td className="px-5 py-3">Total</td>
              <td className="px-3 py-3 text-right tabular">{formatGBP(months.reduce((a, m) => a + m.deposit, 0))}</td>
              <td className="px-3 py-3 text-right tabular">{formatGBP(months.reduce((a, m) => a + m.balance, 0))}</td>
              <td className="px-3 py-3 text-right tabular">{formatGBP(total)}</td>
              <td className="hidden px-5 py-3 text-right tabular sm:table-cell">{months.reduce((a, m) => a + m.count, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* Revenue by job */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="text-[15px] font-semibold tracking-tight">Revenue by job</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">Every accepted quote, what has been paid and what is still owed.</p>
        </div>
        <Paginated
          items={jobs}
          pageSize={6}
          className="divide-y divide-line"
          render={(j) => {
            const pct = j.value ? Math.min(100, (j.paid / j.value) * 100) : 0;
            const unpaid = j.inv.find((i) => i.status === "unpaid");
            return (
              <div key={j.q.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_auto]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar user={j.owner} size={30} />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium">{j.p?.addressLine1}, {j.p?.town}</p>
                    <p className="truncate text-[12px] text-muted">{j.owner?.name} · {j.q.number}</p>
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="text-muted">{formatGBP(j.paid)} of {formatGBP(j.value)}</span>
                    <span className={cn("font-medium", j.outstanding > 0.01 ? "text-sev-major" : "text-emerald-700")}>
                      {j.outstanding > 0.01 ? `${formatGBP(j.outstanding)} owed` : "Paid in full"}
                    </span>
                  </div>
                  {/* thin segmented meter: paid vs owed */}
                  <div className="flex h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SERIES[0].color }} />
                  </div>
                </div>
                <div className="row-start-1 sm:row-start-auto">
                  {unpaid ? (
                    <button onClick={() => onOpenInvoice(unpaid.id)} className="rounded-lg border border-line-strong px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:bg-sunken">
                      View {unpaid.number}
                    </button>
                  ) : (
                    <span className="text-[12px] text-muted">{j.lastPaid ? `Last paid ${new Date(j.lastPaid).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "—"}</span>
                  )}
                </div>
              </div>
            );
          }}
        />
      </Card>
    </div>
  );
}

function Tile({ label, value, sub, delta }: { label: string; value: string; sub: string; delta?: number | null }) {
  const Icon = delta == null ? null : delta > 0.005 ? ArrowUpRight : delta < -0.005 ? ArrowDownRight : Minus;
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <p className="text-[12.5px] font-medium text-muted">{label}</p>
      <div className="mt-2.5 flex items-baseline gap-2">
        <p className="text-[24px] font-semibold tracking-tight">{value}</p>
        {Icon && delta != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold tabular",
              delta > 0.005 ? "bg-emerald-50 text-emerald-700" : delta < -0.005 ? "bg-orange-50 text-orange-700" : "bg-sunken text-muted",
            )}
          >
            <Icon className="size-3" /> {Math.abs(Math.round(delta * 100))}%
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-[12.5px] text-muted">{sub}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Stacked column chart (SVG), measured to its container             */
/* ---------------------------------------------------------------- */

function niceMax(v: number) {
  if (v <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

function RevenueChart({ months, best, series }: { months: MonthRow[]; best: string; series: readonly (typeof SERIES)[number][] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 240;
  const pad = { top: 22, right: 8, bottom: 26, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...months.map((m) => m.total)) * 1.08);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const band = innerW / months.length;
  const barW = Math.min(24, band * 0.56);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const GAP = 2;

  /** Column with a 4px rounded data-end and a square baseline. */
  const topRounded = (x: number, yTop: number, w: number, h: number) => {
    const r = Math.min(4, h, w / 2);
    return `M${x},${yTop + h}V${yTop + r}Q${x},${yTop} ${x + r},${yTop}H${x + w - r}Q${x + w},${yTop} ${x + w},${yTop + r}V${yTop + h}Z`;
  };

  const tip = hover != null ? months[hover] : null;
  const tipX = hover != null ? pad.left + band * hover + band / 2 : 0;

  return (
    <div ref={wrapRef} className="relative mt-4" onPointerLeave={() => setHover(null)}>
      <svg width={width} height={H} role="img" aria-label="Money collected per month, deposits and balances. Exact values are in the month-by-month table below.">
        {/* recessive grid + y ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#ebe8e1" strokeWidth={1} />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#9a9ea6" className="tabular">
              {t >= 1000 ? `£${(t / 1000).toFixed(t % 1000 ? 1 : 0)}K` : `£${Math.round(t)}`}
            </text>
          </g>
        ))}

        {months.map((m, i) => {
          const cx = pad.left + band * i + band / 2;
          const x = cx - barW / 2;
          const depH = (m.deposit / max) * innerH;
          const balH = (m.balance / max) * innerH;
          const base = pad.top + innerH;
          const hasBoth = m.deposit > 0 && m.balance > 0;
          const depTop = base - depH;
          const balTop = depTop - balH - (hasBoth ? GAP : 0);
          const dim = hover != null && hover !== i;
          return (
            <g key={m.key} opacity={dim ? 0.45 : 1} style={{ transition: "opacity 120ms" }}>
              {/* deposits: rounded only if they are the top segment */}
              {m.deposit > 0 &&
                (m.balance > 0 ? (
                  <rect x={x} y={depTop} width={barW} height={depH} fill={SERIES[0].color} />
                ) : (
                  <path d={topRounded(x, depTop, barW, depH)} fill={SERIES[0].color} />
                ))}
              {m.balance > 0 && <path d={topRounded(x, balTop, barW, balH)} fill={SERIES[1].color} />}
              {/* direct label: the best month only */}
              {m.key === best && m.total > 0 && (
                <text x={cx} y={balTop > 0 && m.balance > 0 ? balTop - 6 : depTop - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#3b4048" className="tabular">
                  {gbp0.format(m.total)}
                </text>
              )}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill={hover === i ? "#15181c" : "#6b7079"} fontWeight={hover === i ? 600 : 400}>
                {m.label}
              </text>
              {/* hit target: the whole band, bigger than the mark */}
              <rect
                x={pad.left + band * i}
                y={pad.top}
                width={band}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${m.long}: ${formatGBP(m.total)} collected. Deposits ${formatGBP(m.deposit)}, balances ${formatGBP(m.balance)}.`}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ outline: "none", cursor: "default" }}
              />
            </g>
          );
        })}
        {/* baseline */}
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#d6d2c7" strokeWidth={1} />
      </svg>

      {tip && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-48 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-lift"
          style={{ left: Math.min(Math.max(tipX, 100), width - 100) }}
          role="status"
        >
          <p className="text-[11.5px] text-muted">{tip.long}</p>
          <p className="mt-0.5 text-[16px] font-semibold tabular">{formatGBP(tip.total)}</p>
          <ul className="mt-1.5 space-y-1">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-[12px]">
                <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                <span className="text-ink-2">{s.label}</span>
                <span className="ml-auto font-medium tabular">{formatGBP(tip[s.key])}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-faint">{tip.count} {tip.count === 1 ? "payment" : "payments"}</p>
        </div>
      )}
    </div>
  );
}
