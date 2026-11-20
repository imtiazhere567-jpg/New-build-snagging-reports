"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Bot,
  Building2,
  CircleCheck,
  CircleDashed,
  Database,
  FileText,
  FlaskConical,
  Play,
  PoundSterling,
  RotateCcw,
  Save,
} from "lucide-react";
import { PageHeader } from "@/components/shell/contractor-shell";
import { Button, Card } from "@/components/ui/primitives";
import { LogoMark } from "@/components/ui/logo";
import { Dropdown } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/data/store";
import { APP_MODE } from "@/lib/config";
import type { CompanySettings } from "@/lib/types";
import { cn, formatGBP } from "@/lib/utils";

const SECTIONS = [
  { id: "company", label: "Company profile", icon: Building2 },
  { id: "money", label: "Quotes & payments", icon: PoundSterling },
  { id: "reminders", label: "Automatic reminders", icon: Bot },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "documents", label: "Reports & emails", icon: FileText },
  { id: "data", label: "Demo & data", icon: Database },
] as const;

const BRAND_COLOURS = ["#12695a", "#1d4ed8", "#7c3aed", "#be123c", "#c2410c", "#15181c"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SettingsPage() {
  const saved = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const runAutoReminders = useStore((s) => s.runAutoReminders);
  const resetDemo = useStore((s) => s.resetDemo);
  const [draft, setDraft] = useState<CompanySettings>(saved);
  const [active, setActive] = useState<string>("company");
  const [confirmReset, setConfirmReset] = useState(false);

  const set = <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const errors = {
    name: !draft.name.trim() ? "Enter your company name" : undefined,
    email: !EMAIL.test(draft.email.trim()) ? "Enter a valid email address" : undefined,
  };
  const valid = !errors.name && !errors.email;

  // Highlight the section in view
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const save = () => {
    if (!valid) return;
    updateSettings(draft);
    toast({ title: "Settings saved", body: "New quotes, invoices and emails will use these settings." });
  };

  return (
    <div className="animate-fade-up pb-24">
      <PageHeader title="Settings" description="Your company details, pricing defaults, reminders and notifications." />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        {/* Section nav */}
        <nav className="-mx-4 overflow-x-auto px-4 scrollbar-none lg:sticky lg:top-20 lg:mx-0 lg:self-start lg:px-0" aria-label="Settings sections">
          <ul className="flex gap-1 lg:flex-col">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                    active === s.id ? "bg-surface text-ink shadow-card ring-1 ring-line" : "text-muted hover:bg-sunken hover:text-ink",
                  )}
                >
                  <s.icon className={cn("size-4", active === s.id ? "text-brand-600" : "text-faint")} /> {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          {/* ---------- Company ---------- */}
          <Section id="company" title="Company profile" description="Shown on quotes, invoices, reports and every email.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name" error={errors.name} className="sm:col-span-2">
                <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={input(errors.name)} />
              </Field>
              <Field label="Tagline" className="sm:col-span-2">
                <input value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} className={input()} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <input value={draft.address} onChange={(e) => set("address", e.target.value)} className={input()} />
              </Field>
              <Field label="Phone">
                <input value={draft.phone} onChange={(e) => set("phone", e.target.value)} className={input()} />
              </Field>
              <Field label="Email" error={errors.email}>
                <input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} className={input(errors.email)} />
              </Field>
              <Field label="Website" className="sm:col-span-2">
                <input value={draft.website} onChange={(e) => set("website", e.target.value)} className={input()} />
              </Field>
            </div>

            <div className="mt-5 grid gap-5 border-t border-line pt-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink-2">Brand colour</p>
                <div className="flex flex-wrap items-center gap-2">
                  {BRAND_COLOURS.map((c) => (
                    <button
                      key={c}
                      onClick={() => set("brandColor", c)}
                      aria-label={`Use ${c}`}
                      aria-pressed={draft.brandColor === c}
                      className={cn("size-8 rounded-full ring-offset-2 transition-transform hover:scale-105", draft.brandColor === c && "ring-2 ring-ink")}
                      style={{ background: c }}
                    />
                  ))}
                  <label className="relative ml-1 flex h-8 items-center gap-2 rounded-lg border border-line-strong px-2 text-[12.5px] text-muted">
                    <input type="color" value={draft.brandColor} onChange={(e) => set("brandColor", e.target.value)} className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" aria-label="Custom brand colour" />
                    <span className="font-mono uppercase">{draft.brandColor}</span>
                  </label>
                </div>
                <p className="mt-2 text-[12px] text-muted">Used as the accent on quotes, invoices and report PDFs.</p>
              </div>
              {/* Live letterhead preview */}
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink-2">Preview</p>
                <div className="overflow-hidden rounded-xl border border-line">
                  <div className="h-1.5" style={{ background: draft.brandColor }} />
                  <div className="flex items-start gap-3 p-3.5">
                    <LogoMark className="size-9" />
                    <div className="min-w-0 text-[12px] leading-relaxed text-muted">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{draft.name || "Your company"}</p>
                      <p className="truncate">{draft.tagline}</p>
                      <p className="truncate">{draft.phone} · {draft.email}</p>
                    </div>
                    <span className="ml-auto rounded-md px-2 py-0.5 text-[10.5px] font-semibold tracking-wider text-white uppercase" style={{ background: draft.brandColor }}>
                      Invoice
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ---------- Money ---------- */}
          <Section id="money" title="Quotes & payments" description="Defaults for every new quote and invoice. You can still change them on a single quote.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-[13px] font-medium text-ink-2">Default deposit</p>
                  <p className="text-[13px] font-semibold tabular">{draft.defaultDepositPercent}%</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1">
                    {[0, 20, 25, 30, 50, 100].map((p) => (
                      <button
                        key={p}
                        onClick={() => set("defaultDepositPercent", p)}
                        className={cn(
                          "h-8 rounded-lg px-2.5 text-[12.5px] font-medium tabular",
                          draft.defaultDepositPercent === p ? "bg-ink text-white" : "border border-line text-ink-2 hover:bg-sunken",
                        )}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={draft.defaultDepositPercent}
                    onChange={(e) => set("defaultDepositPercent", Number(e.target.value))}
                    className="min-w-[160px] flex-1 accent-brand-600"
                    aria-label="Default deposit percentage"
                  />
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  On a £1,000 quote the owner pays {formatGBP(1000 * (draft.defaultDepositPercent / 100))} to book and {formatGBP(1000 * (1 - draft.defaultDepositPercent / 100))} on completion.
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink-2">VAT rate</p>
                <Dropdown
                  label="VAT rate"
                  value={String(draft.vatRate)}
                  onChange={(v) => set("vatRate", Number(v))}
                  options={[
                    { value: "0.2", label: "20% (standard rate)" },
                    { value: "0.05", label: "5% (reduced rate)" },
                    { value: "0", label: "0% (not VAT registered)" },
                  ]}
                />
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink-2">Invoice payment terms</p>
                <Dropdown
                  label="Payment terms"
                  value={String(draft.invoiceDueDays)}
                  onChange={(v) => set("invoiceDueDays", Number(v))}
                  options={[7, 14, 21, 30].map((d) => ({ value: String(d), label: `${d} days` }))}
                />
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink-2">Quotes valid for</p>
                <Dropdown
                  label="Quote validity"
                  value={String(draft.quoteValidDays)}
                  onChange={(v) => set("quoteValidDays", Number(v))}
                  options={[7, 14, 21, 30].map((d) => ({ value: String(d), label: `${d} days` }))}
                />
              </div>
              <Field label="Default message on new quotes" className="sm:col-span-2">
                <textarea rows={3} value={draft.quoteMessage} onChange={(e) => set("quoteMessage", e.target.value)} className={cn(input(), "h-auto resize-y py-2.5 leading-relaxed")} />
              </Field>
            </div>
          </Section>

          {/* ---------- Reminders ---------- */}
          <Section id="reminders" title="Automatic reminders" description="SnagSnap chases owners for you. Every automatic reminder appears in that quote's or invoice's history.">
            <div className="divide-y divide-line">
              <ToggleRow
                title="Remind owners about unanswered quotes"
                body={`If a quote has no reply, email the owner every ${draft.autoReminders.quoteAfterDays} days until they respond.`}
                on={draft.autoReminders.quotes}
                onChange={(v) => set("autoReminders", { ...draft.autoReminders, quotes: v })}
              >
                <DaysPicker
                  value={draft.autoReminders.quoteAfterDays}
                  options={[3, 5, 7, 14]}
                  disabled={!draft.autoReminders.quotes}
                  onChange={(n) => set("autoReminders", { ...draft.autoReminders, quoteAfterDays: n })}
                  suffix="days after sending"
                />
              </ToggleRow>
              <ToggleRow
                title="Remind owners about overdue invoices"
                body={`Once an invoice is ${draft.autoReminders.invoiceAfterDaysOverdue} days overdue, email the owner, then again every ${draft.autoReminders.invoiceAfterDaysOverdue} days.`}
                on={draft.autoReminders.invoices}
                onChange={(v) => set("autoReminders", { ...draft.autoReminders, invoices: v })}
              >
                <DaysPicker
                  value={draft.autoReminders.invoiceAfterDaysOverdue}
                  options={[1, 3, 7, 14]}
                  disabled={!draft.autoReminders.invoices}
                  onChange={(n) => set("autoReminders", { ...draft.autoReminders, invoiceAfterDaysOverdue: n })}
                  suffix="days overdue"
                />
              </ToggleRow>
              <ToggleRow
                title="Tell team members about overdue jobs"
                body="Each morning, anyone with a job past its target date gets a short list of what's overdue."
                on={draft.autoReminders.overdueJobsToTeam}
                onChange={(v) => set("autoReminders", { ...draft.autoReminders, overdueJobsToTeam: v })}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-3.5">
              <FlaskConical className="size-4 shrink-0 text-brand-600" />
              <p className="min-w-0 flex-1 text-[12.5px] text-ink-2">
                In live mode these run on the server every morning. In the demo, run them now to see what would be sent today (uses your <b>saved</b> settings).
              </p>
              <Button
                size="sm"
                disabled={dirty}
                title={dirty ? "Save your changes first" : undefined}
                onClick={() => {
                  const r = runAutoReminders();
                  const n = r.quotes + r.invoices;
                  toast(
                    n
                      ? { title: `${n} automatic ${n === 1 ? "reminder" : "reminders"} sent`, body: `${r.quotes} for quotes and ${r.invoices} for overdue invoices. See them in each record's reminder history.` }
                      : { title: "Nothing due today", body: "No quote or invoice needs a reminder under your current rules.", tone: "info" },
                  );
                }}
              >
                <Play className="size-3.5" /> Run reminders now
              </Button>
            </div>
          </Section>

          {/* ---------- Notifications ---------- */}
          <Section id="notifications" title="Notifications" description={`Emails sent to you at ${saved.email}.`}>
            <div className="divide-y divide-line">
              {(
                [
                  ["newReport", "A home owner submits a snag report", "So you can price it quickly."],
                  ["quoteAccepted", "An owner accepts or declines a quote", "Includes which items they chose."],
                  ["paymentReceived", "A payment is received", "Deposits and final balances."],
                  ["jobFixed", "A team member marks a job fixed", "Can be noisy on busy weeks."],
                  ["fixReopened", "An owner says a fix isn't done", "The job goes back to the team member."],
                  ["weeklySummary", "Weekly summary every Monday", "Open jobs, overdue items and money collected."],
                ] as const
              ).map(([key, title, body]) => (
                <ToggleRow key={key} title={title} body={body} on={draft.notify[key]} onChange={(v) => set("notify", { ...draft.notify, [key]: v })} />
              ))}
            </div>
          </Section>

          {/* ---------- Documents ---------- */}
          <Section id="documents" title="Reports & emails" description="Standard wording printed on every report and invoice.">
            <Field label="Report and invoice footer">
              <textarea rows={3} value={draft.reportFooter} onChange={(e) => set("reportFooter", e.target.value)} className={cn(input(), "h-auto resize-y py-2.5 leading-relaxed")} />
            </Field>
            <p className="mt-2 text-[12px] text-muted">Tip: mention what the report does not cover, and the NHBC 2-year defects period.</p>
          </Section>

          {/* ---------- Data ---------- */}
          <Section id="data" title="Demo & data" description="How this copy of SnagSnap is running.">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-canvas p-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-[12px] font-semibold text-white uppercase">
                <FlaskConical className="size-3.5" /> {APP_MODE} mode
              </span>
              <p className="min-w-0 flex-1 text-[13px] text-ink-2">
                {APP_MODE === "demo"
                  ? "Fictional data, saved only in this browser. Emails go to the demo inbox and card payments use Stripe test cards."
                  : "Connected to live services."}
              </p>
            </div>
            <p className="mt-5 mb-2 text-[13px] font-medium text-ink-2">To go live, connect</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                ["Supabase", "Database, sign-in and photo storage"],
                ["Claude (Anthropic API key)", "Reads each photo and writes the snag"],
                ["Resend", "Sends real emails instead of the demo inbox"],
                ["Stripe", "Card payments (test keys first)"],
              ].map(([name, what]) => (
                <li key={name} className="flex items-start gap-2.5 rounded-xl border border-line p-3">
                  {APP_MODE === "live" ? <CircleCheck className="mt-0.5 size-4 text-emerald-600" /> : <CircleDashed className="mt-0.5 size-4 text-faint" />}
                  <div>
                    <p className="text-[13px] font-medium">{name}</p>
                    <p className="text-[12px] text-muted">{what}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-muted">Keys go in the project&apos;s <span className="font-mono">.env</span> file; see <span className="font-mono">.env.example</span>.</p>
            {APP_MODE === "demo" && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium">Reset demo data</p>
                  <p className="text-[12.5px] text-muted">Puts every home, quote, payment, email and setting back to the starting state.</p>
                </div>
                <Button variant="secondary" onClick={() => setConfirmReset(true)}>
                  <RotateCcw className="size-4" /> Reset demo
                </Button>
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Unsaved changes bar */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-64">
          <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-night px-4 py-3 text-white shadow-2xl animate-fade-up">
            <span className="size-2 shrink-0 rounded-full bg-highlight" />
            <p className="flex-1 text-[13.5px]">{valid ? "You have unsaved changes" : "Fix the highlighted fields to save"}</p>
            <button onClick={() => setDraft(saved)} className="h-9 rounded-xl px-3 text-[13px] font-medium text-white/70 hover:bg-white/10 hover:text-white">
              Discard
            </button>
            <Button onClick={save} disabled={!valid} className="bg-highlight text-night hover:bg-[#cbe55c]">
              <Save className="size-4" /> Save settings
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        icon={<RotateCcw className="size-5" />}
        title="Reset all demo data?"
        description="Everything you've changed in this browser will be lost. You can't undo this."
        confirmLabel="Reset demo"
        confirmIcon={<RotateCcw className="size-4" />}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo();
          setDraft(useStore.getState().settings);
          setConfirmReset(false);
          toast({ title: "Demo data reset", body: "Everything is back to the starting state." });
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24 p-5 sm:p-6">
      <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">{description}</p>
      {children}
    </Card>
  );
}

const input = (error?: string) =>
  cn(
    "h-10 w-full rounded-xl border bg-surface px-3 text-[14px] outline-none placeholder:text-faint focus:ring-2",
    error ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "border-line-strong hover:border-faint focus:border-brand-500 focus:ring-brand-500/15",
  );

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-red-600">{error}</span>}
    </label>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-brand-600" : "bg-line-strong")}
    >
      <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", on && "translate-x-5")} />
    </button>
  );
}

function ToggleRow({ title, body, on, onChange, children }: { title: string; body: string; on: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-3 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium">{title}</p>
        <p className="mt-0.5 text-[12.5px] text-muted">{body}</p>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
      <Switch on={on} onChange={onChange} label={title} />
    </div>
  );
}

function DaysPicker({ value, options, onChange, disabled, suffix }: { value: number; options: number[]; onChange: (n: number) => void; disabled?: boolean; suffix: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", disabled && "pointer-events-none opacity-40")}>
      {options.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={cn("h-7 rounded-lg px-2.5 text-[12px] font-medium tabular", value === n ? "bg-ink text-white" : "border border-line text-ink-2 hover:bg-sunken")}
        >
          {n}
        </button>
      ))}
      <span className="ml-1 text-[12px] text-muted">{suffix}</span>
    </div>
  );
}
