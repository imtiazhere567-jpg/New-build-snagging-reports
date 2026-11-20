"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, ChevronRight, Home, KeyRound, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { Logo, LogoMark } from "@/components/ui/logo";
import { Button } from "@/components/ui/primitives";
import { AccountSelect, type AccountOption } from "@/components/ui/account-select";
import { toast } from "@/components/ui/toast";
import { DatePicker } from "@/components/ui/date-picker";
import { useStore, type InviteOwnerInput } from "@/lib/data/store";
import { useHydrated } from "@/lib/data/use-hydrated";
import { useSignOutNotice } from "@/components/shell/account-menu";
import { cn } from "@/lib/utils";
import { isLive } from "@/lib/config";
import { loadLive } from "@/lib/data/live-client";

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Form = Omit<InviteOwnerInput, "message">;
const BLANK: Form = { name: "", email: "", phone: "", addressLine1: "", town: "", postcode: "", plot: "", development: "", completionDate: "" };

/**
 * The home owner's phone app entry: /phone
 * Existing customers pick their account; new home owners add themselves and their home.
 */
export default function PhoneEntry() {
  const ready = useHydrated();
  const router = useRouter();
  const company = useStore((s) => s.settings.name);
  const users = useStore((s) => s.users);
  const properties = useStore((s) => s.properties);
  const signIn = useStore((s) => s.signIn);
  const registerOwner = useStore((s) => s.registerOwner);

  const [step, setStep] = useState<"choose" | "existing" | "new">("choose");
  const [picked, setPicked] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const [touched, setTouched] = useState(false);

  const owners: AccountOption[] = useMemo(
    () =>
      users
        .filter((u) => u.role === "owner")
        .map((u) => {
          const p = properties.find((x) => x.ownerId === u.id);
          return { user: u, subtitle: p ? `${p.addressLine1}, ${p.town}` : u.email };
        }),
    [users, properties],
  );

  const enter = (userId: string) => {
    useSignOutNotice.getState().set(false);
    signIn(userId);
    router.push("/owner");
  };

  /* ---------- New owner form ---------- */
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const errors: Partial<Record<keyof Form, string>> = {};
  if (!form.name.trim()) errors.name = "Enter your name";
  if (!EMAIL.test(form.email.trim())) errors.email = "Enter a valid email address";
  else if (users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) errors.email = "This email already has an account. Choose “I already have an account”.";
  if (form.phone.trim() && form.phone.replace(/\D/g, "").length < 10) errors.phone = "Enter a full mobile number";
  if (!form.addressLine1.trim()) errors.addressLine1 = "Enter the first line of your address";
  if (!form.town.trim()) errors.town = "Enter your town";
  if (!UK_POSTCODE.test(form.postcode.trim())) errors.postcode = "Enter a UK postcode, e.g. HG2 7QT";
  if (!form.completionDate) errors.completionDate = "When did you get the keys?";
  const valid = Object.keys(errors).length === 0;
  const err = (k: keyof Form) => (touched ? errors[k] : undefined);

  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) {
      toast({ title: "A few details are missing", body: "Check the fields marked in red.", tone: "info" });
      return;
    }
    const plot = form.plot.trim();
    const input = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      addressLine1: form.addressLine1.trim(),
      town: form.town.trim(),
      plot: plot ? (/^plot/i.test(plot) ? plot : `Plot ${plot}`) : "Plot –",
      development: form.development.trim() || form.addressLine1.trim(),
    };
    if (isLive) {
      // Live: the server creates the account and signs this phone in
      setSaving(true);
      setServerError(null);
      try {
        const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setServerError(body.error ?? "Couldn't add your home. Please try again.");
          return;
        }
        await loadLive();
      } catch {
        setServerError("Couldn't reach the server. Check your connection and try again.");
        return;
      } finally {
        setSaving(false);
      }
    } else registerOwner(input);
    useSignOutNotice.getState().set(false);
    toast({ title: "Your home is set up", body: `${company} can now see your home. Start photographing any snags.` });
    router.push("/owner");
  };

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LogoMark className="size-10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-4 pt-[max(env(safe-area-inset-top),20px)] pb-8">
        {/* Top bar */}
        <div className="flex h-10 items-center">
          {step !== "choose" ? (
            <button onClick={() => { setStep("choose"); setTouched(false); }} className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[14px] font-medium text-ink-2 hover:bg-sunken" aria-label="Back">
              <ArrowLeft className="size-4" /> Back
            </button>
          ) : (
            <Logo />
          )}
        </div>

        {/* ---------- Choose ---------- */}
        {step === "choose" && (
          <div className="flex flex-1 flex-col animate-fade-up">
            <div className="mt-6 overflow-hidden rounded-3xl bg-night bg-blueprint-dark p-6 text-white">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-highlight text-night">
                <Camera className="size-6" />
              </span>
              <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.02em]">Report snags in your new home</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-white/65">
                Photograph anything that isn&apos;t right. Our AI writes it up and sends it straight to {company}.
              </p>
            </div>

            <p className="mt-7 mb-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">How would you like to continue?</p>
            <div className="space-y-2.5">
              <ChoiceCard
                icon={<KeyRound className="size-5" />}
                title="I already have an account"
                body="Your builder set you up, or you've used SnagSnap before."
                onClick={() => (isLive ? router.push("/login") : setStep("existing"))}
              />
              <ChoiceCard
                icon={<UserPlus className="size-5" />}
                title="I'm a new home owner"
                body="Add yourself and your home in about a minute."
                onClick={() => setStep("new")}
                highlight
              />
            </div>

            <p className="mt-auto flex items-center justify-center gap-1.5 pt-10 text-[12px] text-muted">
              <ShieldCheck className="size-3.5" /> No password needed. Your photos stay private to you and your builder.
            </p>
          </div>
        )}

        {/* ---------- Existing customer ---------- */}
        {step === "existing" && (
          <div className="flex flex-1 flex-col animate-fade-up">
            <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.02em]">Welcome back</h1>
            <p className="mt-1 text-[14px] text-muted">Choose your name to open your home.</p>

            <div className="mt-6">
              <p className="mb-1.5 text-[13px] font-medium text-ink-2">Your account</p>
              <AccountSelect options={owners} value={picked} onChange={setPicked} placeholder="Choose your name…" searchPlaceholder="Search by name or address" />
            </div>

            <Button className="mt-5 h-12 w-full text-[15px]" disabled={!picked} onClick={() => picked && enter(picked)}>
              Open my home <ArrowRight className="size-4" />
            </Button>

            <button onClick={() => setStep("new")} className="mt-4 text-[13px] font-medium text-brand-700 hover:underline">
              Not on the list? Add your home
            </button>
          </div>
        )}

        {/* ---------- New home owner ---------- */}
        {step === "new" && (
          <form onSubmit={register} noValidate className="flex flex-1 flex-col animate-fade-up">
            <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.02em]">Add your home</h1>
            <p className="mt-1 text-[14px] text-muted">These details go to {company} so they know whose home each snag is in.</p>

            <Section icon={<UserPlus className="size-4" />} title="About you">
              <Field label="Full name" error={err("name")}>
                <input value={form.name} onChange={set("name")} placeholder="e.g. Sarah & James Cooper" autoComplete="name" className={inputCls(err("name"))} />
              </Field>
              <Field label="Email" error={err("email")}>
                <input type="email" inputMode="email" value={form.email} onChange={set("email")} placeholder="name@example.co.uk" autoComplete="email" className={inputCls(err("email"))} />
              </Field>
              <Field label="Mobile" hint="Optional" error={err("phone")}>
                <input type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="07700 900 000" autoComplete="tel" className={inputCls(err("phone"))} />
              </Field>
            </Section>

            <Section icon={<Home className="size-4" />} title="Your new home">
              <Field label="Address line 1" error={err("addressLine1")}>
                <input value={form.addressLine1} onChange={set("addressLine1")} placeholder="e.g. 9 Larch Avenue" autoComplete="address-line1" className={inputCls(err("addressLine1"))} />
              </Field>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                <Field label="Town" error={err("town")}>
                  <input value={form.town} onChange={set("town")} placeholder="Harrogate" autoComplete="address-level2" className={inputCls(err("town"))} />
                </Field>
                <Field label="Postcode" error={err("postcode")}>
                  <input value={form.postcode} onChange={set("postcode")} placeholder="HG2 7QT" autoComplete="postal-code" className={cn(inputCls(err("postcode")), "uppercase")} />
                </Field>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
                <Field label="Plot" hint="Optional">
                  <input value={form.plot} onChange={set("plot")} placeholder="18" className={inputCls()} />
                </Field>
                <Field label="Development" hint="Optional">
                  <input value={form.development} onChange={set("development")} placeholder="e.g. Meadowbrook Rise" className={inputCls()} />
                </Field>
              </div>
              <Field label="When did you get the keys?" error={err("completionDate")}>
                <DatePicker
                  size="lg"
                  label="When did you get the keys?"
                  value={form.completionDate}
                  onChange={(v) => setForm((f) => ({ ...f, completionDate: v }))}
                  max={new Date().toISOString().slice(0, 10)}
                  placeholder="Choose the date"
                  error={!!err("completionDate")}
                />
              </Field>
            </Section>

            <div className="mt-6 flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-[12.5px] leading-relaxed text-muted">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-600" />
              We&apos;ll set up the usual rooms (kitchen, bedrooms, bathroom and more) so you can start photographing straight away.
            </div>

            {serverError && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">{serverError}</p>}
            <Button type="submit" className="mt-5 h-12 w-full text-[15px]" disabled={saving}>
              {saving ? "Adding your home…" : <>Add my home <ArrowRight className="size-4" /></>}
            </Button>
            <button type="button" onClick={() => (isLive ? router.push("/login") : setStep("existing"))} className="mt-4 text-[13px] font-medium text-brand-700 hover:underline">
              Already have an account? Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChoiceCard({ icon, title, body, onClick, highlight }: { icon: React.ReactNode; title: string; body: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-2xl border bg-surface p-4 text-left transition-colors outline-none hover:bg-sunken/60 focus-visible:ring-2 focus-visible:ring-brand-500/40",
        highlight ? "border-brand-300" : "border-line",
      )}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", highlight ? "bg-brand-600 text-white" : "bg-sunken text-ink-2")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{body}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-faint" />
    </button>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <p className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold">
        <span className="text-brand-700">{icon}</span> {title}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const inputCls = (error?: string) =>
  cn(
    "h-12 w-full rounded-xl border bg-surface px-3.5 text-[15px] outline-none placeholder:text-faint focus:ring-2",
    error ? "border-red-400 focus:ring-red-500/15" : "border-line-strong focus:border-brand-500 focus:ring-brand-500/15",
  );

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-ink-2">
        {label}
        {hint && <span className="text-[11.5px] font-normal text-faint">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-red-600">{error}</span>}
    </label>
  );
}
