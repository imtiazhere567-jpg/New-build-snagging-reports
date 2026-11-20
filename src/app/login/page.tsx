"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, FlaskConical, Inbox, Lock, Mail, MailCheck, Sparkles } from "lucide-react";
import { Logo, LogoMark } from "@/components/ui/logo";
import { Button } from "@/components/ui/primitives";
import { AccountSelect, type AccountOption } from "@/components/ui/account-select";
import { useStore } from "@/lib/data/store";
import { useSignOutNotice } from "@/components/shell/account-menu";
import { useHydrated } from "@/lib/data/use-hydrated";
import { propertyStage } from "@/lib/data/queries";
import { TRADE_LABEL } from "@/lib/constants";
import { isDemo, isLive } from "@/lib/config";
import type { Role } from "@/lib/types";
import { uid } from "@/lib/utils";

const HOME: Record<Role, string> = { contractor: "/contractor", team: "/team", owner: "/owner" };

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const ready = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const state = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [demoUser, setDemoUser] = useState<string | null>("u_contractor");
  const [devLink, setDevLink] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(params.get("error") === "link" ? "That sign-in link has expired or was already replaced. Ask for a new one below." : null);
  const [sending, setSending] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);

  // Live: already signed in -> straight to your screens; brand-new system -> offer setup
  const me = state.users.find((u) => u.id === state.currentUserId);
  useEffect(() => {
    if (!isLive || !ready) return;
    if (me) router.replace(HOME[me.role]);
    else
      fetch("/api/setup")
        .then((r) => r.json())
        .then((b: { needed?: boolean }) => setSetupNeeded(!!b.needed))
        .catch(() => {});
  }, [ready, me, router]);

  const enterAs = (userId: string) => {
    const u = state.users.find((x) => x.id === userId);
    if (!u) return;
    useSignOutNotice.getState().set(false);
    state.signIn(u.id);
    router.push(HOME[u.role]);
  };

  // Magic-link entry from emails: /login?as=<userId>
  const as = params.get("as");
  // Set by the account menu when someone signs out; cleared when they sign in again.
  const signedOut = useSignOutNotice((s) => s.shown);
  useEffect(() => {
    if (ready && as && isDemo) enterAs(as);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, as]);

  const accounts: AccountOption[] = useMemo(
    () =>
      state.users.map((u) => {
        if (u.role === "contractor") return { user: u, subtitle: `${u.title} · ${state.settings.name}`, tag: "Admin" };
        if (u.role === "team") return { user: u, subtitle: TRADE_LABEL[u.trade!] };
        const p = state.properties.find((x) => x.ownerId === u.id);
        return { user: u, subtitle: p ? `${p.addressLine1}, ${p.town}` : "", tag: p ? propertyStage(state, p.id) : undefined };
      }),
    [state],
  );

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (isLive) {
      setSending(true);
      setSendError(null);
      try {
        const res = await fetch("/api/auth/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: address }) });
        const body = (await res.json().catch(() => ({}))) as { error?: string; devLink?: string };
        if (!res.ok) return setSendError(body.error ?? "Couldn't send the link. Please try again.");
        setDevLink(body.devLink ?? null);
        setSent(address);
      } catch {
        setSendError("Couldn't reach the server. Check your connection and try again.");
      } finally {
        setSending(false);
      }
      return;
    }
    const u = state.users.find((x) => x.email.toLowerCase() === address.toLowerCase());
    // Demo mode: the "email" is delivered to the in-app demo inbox.
    useStore.setState((s) => ({
      emails: [
        {
          id: uid("em"),
          to: address,
          subject: "Your SnagSnap sign-in link",
          preview: u ? "Tap to sign in. This link expires in 15 minutes." : "We couldn't find an account for this email.",
          body: u
            ? `Hi ${u.name.split(/\s|&/)[0]},\n\nTap the button below to sign in to SnagSnap. This link expires in 15 minutes and can only be used once.`
            : "We couldn't find an account for this email address. Ask your contractor to send you an invite.",
          link: u ? `/login?as=${u.id}` : undefined,
          sentAt: new Date().toISOString(),
          read: false,
        },
        ...s.emails,
      ],
    }));
    setSent(address);
  };

  if (!ready || (as && isDemo)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LogoMark className="size-10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BrandPanel />

      <div className="flex flex-col px-5 py-5 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:hidden"><Logo /></Link>
          <Link href="/" className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-muted hover:bg-sunken hover:text-ink">
            <ArrowLeft className="size-4" /> Back to home
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          {sent ? (
            <div className="animate-fade-up text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
                <MailCheck className="size-7" />
              </div>
              <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.025em]">Check your email</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                We sent a sign-in link to <span className="font-medium text-ink">{sent}</span>. Tap it to continue.
              </p>
              {devLink && (
                <a href={devLink} className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-[14px] font-medium text-white hover:bg-ink-2">
                  <ArrowRight className="size-4" /> Open the sign-in link (local testing)
                </a>
              )}
              {isDemo && (
                <Link href="/inbox" className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-[14px] font-medium text-white hover:bg-ink-2">
                  <Inbox className="size-4" /> Open the demo inbox
                </Link>
              )}
              <button onClick={() => setSent(null)} className="mt-5 block w-full text-[13px] text-muted hover:text-ink">
                Use a different email
              </button>
            </div>
          ) : (
            <div className="animate-fade-up">
              {signedOut && (
                <p role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-medium text-emerald-800">
                  <CheckCircle2 className="size-4 shrink-0" /> You&apos;ve signed out. See you soon.
                </p>
              )}
              <LogoMark className="size-11" />
              <h1 className="mt-6 text-[30px] leading-tight font-semibold tracking-[-0.025em]">Welcome back</h1>
              <p className="mt-1.5 text-[15px] text-muted">Sign in to your SnagSnap account.</p>

              {/* Magic link */}
              <form onSubmit={sendLink} className="mt-8">
                <label className="block text-[13px] font-medium text-ink-2" htmlFor="email">Email address</label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.co.uk"
                    className="h-12 w-full rounded-xl bg-surface pr-4 pl-10 text-[15px] ring-1 ring-line-strong outline-none placeholder:text-faint hover:ring-faint focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                {sendError && <p role="alert" className="mt-2 text-[13px] text-red-600">{sendError}</p>}
                <Button type="submit" size="lg" variant="dark" className="mt-3 w-full" disabled={sending}>
                  {sending ? "Sending…" : "Email me a sign-in link"}
                </Button>
                <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[12px] text-faint">
                  <Lock className="size-3" /> No password needed. Links expire after 15 minutes.
                </p>
              </form>

              {/* Demo accounts */}
              {isDemo && (
                <>
                  <div className="my-8 flex items-center gap-3 text-[12px] font-medium text-faint">
                    <span className="h-px flex-1 bg-line" />
                    or explore the demo
                    <span className="h-px flex-1 bg-line" />
                  </div>

                  <div className="rounded-2xl bg-surface p-4 border border-line shadow-card">
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-[13px] font-medium text-ink-2">Demo account</label>
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-brand-700">
                        <FlaskConical className="size-3" /> {state.users.length} accounts
                      </span>
                    </div>
                    <AccountSelect options={accounts} value={demoUser} onChange={setDemoUser} />
                    <Button size="lg" className="mt-3 w-full" disabled={!demoUser} onClick={() => demoUser && enterAs(demoUser)}>
                      Continue to demo <ArrowRight className="size-4" />
                    </Button>
                  </div>
                  <p className="mt-3 text-center text-[12px] text-faint">
                    You can switch accounts any time from the top bar.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {isDemo ? (
          <p className="text-center text-[11.5px] text-faint">Portfolio demo · all people, companies and addresses are fictional</p>
        ) : (
          <p className="text-center text-[12.5px] text-muted">
            New home owner?{" "}
            <Link href="/phone" className="font-medium text-brand-700 hover:underline">Add your home</Link>
            {setupNeeded && (
              <>
                {" "}· First time here?{" "}
                <Link href="/setup" className="font-medium text-brand-700 hover:underline">Set up your company</Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function BrandPanel() {
  const points = [
    "Photograph a fault, AI writes it up",
    "Quotes with item-by-item approval",
    "Every fix tracked until you confirm it",
  ];
  return (
    <div className="relative hidden overflow-hidden bg-night bg-blueprint-dark p-10 text-white lg:flex lg:flex-col xl:p-14">
      <div className="pointer-events-none absolute -bottom-40 -left-24 size-[520px] rounded-full bg-brand-500/25 blur-[110px]" />
      <div className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-highlight/10 blur-[90px]" />

      <Link href="/" className="relative"><Logo inverted /></Link>

      <div className="relative my-auto max-w-md py-12">
        <h2 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] xl:text-[46px]">
          Every snag,
          <br />
          from photo to <span className="text-highlight">fixed.</span>
        </h2>
        <ul className="mt-8 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-3 text-[15px] text-white/70">
              <CheckCircle2 className="size-5 shrink-0 text-brand-300" /> {p}
            </li>
          ))}
        </ul>

        {/* Mini snag card */}
        <div className="mt-12 max-w-sm rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono font-medium">BATH-02</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 font-medium text-orange-300">
              <span className="size-1.5 rounded-full bg-sev-major" /> Major
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-white/45"><Sparkles className="size-3 text-highlight" /> 89%</span>
          </div>
          <p className="mt-2.5 text-[14px] font-semibold">Gap in bath silicone</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-3/4 rounded-full bg-highlight" />
            </div>
            <span className="text-[11.5px] text-white/50">Fixed · awaiting check</span>
          </div>
        </div>
      </div>

      <p className="relative text-[12.5px] text-white/35">Built for UK new-build aftercare</p>
    </div>
  );
}
