"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, KeyRound } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/primitives";
import { isLive } from "@/lib/config";
import { loadLive } from "@/lib/data/live-client";
import { cn } from "@/lib/utils";

/** One-time setup for the live system: creates the contractor (admin) account and the company. */
export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<{ needed: boolean; keyRequired: boolean } | "error" | null>(null);
  const [form, setForm] = useState({ company: "", name: "", email: "", phone: "", setupKey: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLive) return;
    fetch("/api/setup")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStatus)
      .catch(() => setStatus("error"));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent | null, sample = false) => {
    e?.preventDefault();
    if (sample && status && status !== "error" && status.keyRequired && !form.setupKey) return setError("Enter the setup key first.");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sample ? { sample: true, setupKey: form.setupKey } : form),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setError(body.error ?? "Setup failed. Please try again.");
      await loadLive();
      router.push("/contractor");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto w-full max-w-[480px] px-4 py-8">
        <Logo />
        {!isLive ? (
          <Message title="Setup is for the live system" body="This copy is running as the demo. Set NEXT_PUBLIC_APP_MODE=live to use a real database." />
        ) : status === null ? (
          <p className="mt-16 text-center text-[14px] text-muted">Checking…</p>
        ) : status === "error" ? (
          <Message title="Can't reach the database" body="Check that DATABASE_URL is set for this deployment, then reload this page." />
        ) : !status.needed ? (
          <Message title="Already set up" body="Your company is ready. Sign in with your email to continue." cta />
        ) : (
          <form onSubmit={submit} className="mt-10 animate-fade-up">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <Building2 className="size-6" />
            </span>
            <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.02em]">Set up your company</h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              This creates your admin account. You do this once; after that you sign in with your email. You can change the details later in Settings.
            </p>

            <div className="mt-7 space-y-3.5 rounded-2xl border border-line bg-surface p-4">
              <Field label="Company name"><input required value={form.company} onChange={set("company")} placeholder="e.g. Hartwell Building Services" className={input} /></Field>
              <Field label="Your name"><input required value={form.name} onChange={set("name")} placeholder="e.g. Richard Hartwell" autoComplete="name" className={input} /></Field>
              <Field label="Your email" hint="You'll sign in with this"><input required type="email" value={form.email} onChange={set("email")} placeholder="you@company.co.uk" autoComplete="email" className={input} /></Field>
              <Field label="Phone" hint="Optional"><input type="tel" value={form.phone} onChange={set("phone")} placeholder="01423 000 000" autoComplete="tel" className={input} /></Field>
              {status.keyRequired && (
                <Field label="Setup key" hint="The SETUP_KEY you set in Vercel">
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
                    <input required type="password" value={form.setupKey} onChange={set("setupKey")} className={cn(input, "pl-10")} />
                  </div>
                </Field>
              )}
            </div>

            {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">{error}</p>}
            <Button type="submit" className="mt-5 h-12 w-full text-[15px]" disabled={saving}>
              {saving ? "Setting up…" : <>Create my company <ArrowRight className="size-4" /></>}
            </Button>

            <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-4">
              <p className="text-[13.5px] font-semibold">Or fill it with sample data</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                Loads a sample company with an admin, 6 home owners and 7 technicians, with reports, quotes and payments. Anyone can then open those accounts from the sign-in page. Use this for a demo, not for a real business.
              </p>
              <Button type="button" variant="secondary" className="mt-3 w-full" disabled={saving} onClick={() => void submit(null, true)}>
                Load sample data
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const input = "h-12 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[15px] outline-none placeholder:text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-ink-2">
        {label}
        {hint && <span className="text-[11.5px] font-normal text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Message({ title, body, cta }: { title: string; body: string; cta?: boolean }) {
  return (
    <div className="mt-16 text-center">
      <h1 className="text-[22px] font-semibold">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-muted">{body}</p>
      {cta && (
        <Link href="/login" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-[14px] font-semibold text-white hover:bg-brand-700">
          Go to sign in <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
