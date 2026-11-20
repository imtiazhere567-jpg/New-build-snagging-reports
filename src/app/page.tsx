import {
  ArrowRight,
  Camera,
  CheckCircle2,
  HardHat,
  Home,
  PoundSterling,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/primitives";

const STEPS = [
  { icon: Camera, title: "Snap", body: "The home owner photographs each fault, room by room, on their phone." },
  { icon: ScanSearch, title: "AI writes it up", body: "Claude identifies the defect, severity and trade, and drafts a professional description." },
  { icon: PoundSterling, title: "Quote & deposit", body: "The contractor prices each item; the owner accepts line by line and pays a deposit." },
  { icon: Wrench, title: "Fix & verify", body: "Jobs auto-assign to the right tradesperson. The owner confirms every fix." },
];

const ROLES = [
  {
    icon: Home,
    title: "Home owner",
    body: "Capture snags, review the AI report, accept a quote and track every fix.",
    href: "/login?as=u_morgan",
    cta: "Try as Daniel & Charlotte",
  },
  {
    icon: HardHat,
    title: "Contractor",
    body: "Receive reports, send quotes, manage your team and see every job at a glance.",
    href: "/login?as=u_contractor",
    cta: "Try as Hartwell Building",
    featured: true,
  },
  {
    icon: Wrench,
    title: "Team member",
    body: "See only your jobs, post progress with photos and mark items fixed.",
    href: "/login?as=u_oliver",
    cta: "Try as Oliver (Electrician)",
  },
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-night bg-blueprint-dark text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/25 blur-[120px]" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo inverted />
          <ButtonLink href="/login" variant="secondary" size="sm" className="bg-white/10 text-white ring-white/15 hover:bg-white/15">
            Sign in
          </ButtonLink>
        </header>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16 lg:pb-28">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-[12.5px] font-medium text-white/80 ring-1 ring-white/10">
              <Sparkles className="size-3.5 text-highlight" /> AI snagging for UK new-build homes
            </span>
            <h1 className="mt-6 text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[60px]">
              Snag reports in minutes,
              <br />
              <span className="text-highlight">not hours.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/65">
              Home owners photograph the faults. AI writes the report. The contractor quotes, the right
              tradesperson fixes each item, and everyone tracks it to the finish.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/login" size="lg" className="bg-highlight text-night hover:bg-[#cbe55c]">
                Explore the live demo <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="#how" size="lg" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">
                How it works
              </ButtonLink>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[13px] text-white/50">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-brand-300" /> No passwords: magic-link sign in</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-brand-300" /> Branded PDF reports</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-brand-300" /> Stripe deposits</span>
            </div>
          </div>

          <HeroPhone />
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">How it works</p>
        <h2 className="mt-3 max-w-2xl text-[32px] leading-tight font-semibold tracking-[-0.025em] sm:text-[40px]">
          One loop from photo to verified fix.
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl bg-surface p-6 border border-line shadow-card">
              <span className="absolute top-5 right-5 font-mono text-[12px] text-faint">0{i + 1}</span>
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <s.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Roles ---------- */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Try it yourself</p>
              <h2 className="mt-3 text-[32px] leading-tight font-semibold tracking-[-0.025em] sm:text-[40px]">Pick a role and jump in.</h2>
            </div>
            <p className="max-w-sm text-[14px] text-muted">
              Fully interactive demo with fictional data. Your changes stay in your browser. Reset any time.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {ROLES.map((r) => (
              <a
                key={r.title}
                href={r.href}
                className={
                  "group flex flex-col rounded-2xl p-6 transition-all hover:-translate-y-0.5 " +
                  (r.featured
                    ? "bg-night bg-blueprint-dark text-white shadow-lift"
                    : "bg-canvas border border-line hover:shadow-lift")
                }
              >
                <div className={"flex size-11 items-center justify-center rounded-xl " + (r.featured ? "bg-highlight text-night" : "bg-surface text-brand-600 border border-line")}>
                  <r.icon className="size-5" />
                </div>
                <h3 className="mt-6 text-[20px] font-semibold tracking-tight">{r.title}</h3>
                <p className={"mt-2 flex-1 text-[14px] leading-relaxed " + (r.featured ? "text-white/60" : "text-muted")}>{r.body}</p>
                <span className={"mt-8 inline-flex items-center gap-2 text-[14px] font-medium " + (r.featured ? "text-highlight" : "text-brand-700")}>
                  {r.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-[13px] text-muted sm:flex-row sm:px-8">
        <Logo />
        <p className="inline-flex items-center gap-2">
          <ShieldCheck className="size-4" /> Portfolio demo. All people, companies and addresses are fictional.
        </p>
      </footer>
    </div>
  );
}

/** Decorative phone mock-up showing an AI-generated snag card. */
function HeroPhone() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] animate-fade-up [animation-delay:120ms]">
      <div className="absolute -inset-6 rounded-[44px] bg-gradient-to-b from-brand-400/20 to-transparent blur-2xl" />
      <div className="relative rounded-[38px] bg-[#0b0f0e] p-2.5 shadow-2xl ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[30px] bg-canvas text-ink">
          <div className="flex items-center justify-between px-5 pt-4 pb-2 text-[11px] font-semibold">
            <span>9:41</span>
            <span className="h-5 w-20 rounded-full bg-black" />
            <span>5G</span>
          </div>
          <div className="px-4 pb-5">
            <div className="flex gap-1.5 overflow-hidden pb-3">
              {["Kitchen", "Hallway", "Bathroom", "Bed 1"].map((r, i) => (
                <span key={r} className={"rounded-full px-3 py-1 text-[11px] font-medium " + (i === 0 ? "bg-ink text-white" : "bg-surface border border-line text-ink-2")}>
                  {r}
                </span>
              ))}
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-[#dfe3e4] to-[#c3cbcd]">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(0_0_0/0.09)_1.5px,transparent_1.5px),linear-gradient(to_bottom,rgb(0_0_0/0.09)_1.5px,transparent_1.5px)] bg-[size:56px_56px]" />
              <svg className="absolute left-[44%] top-[52%] h-14 w-16 text-black/40" viewBox="0 0 64 56" fill="none">
                <path d="M2 6 L18 22 L24 18 L38 36 L46 32 L62 52" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <div className="absolute left-[40%] top-[48%] h-[34%] w-[34%] rounded-sm border-2 border-red-500" />
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                <Sparkles className="size-3 text-highlight" /> AI analysed · 86%
              </span>
            </div>
            <div className="mt-3 rounded-2xl bg-surface p-3.5 border border-line">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-sunken px-1.5 py-0.5 font-mono text-[10.5px] font-medium">KIT-03</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-800 ring-1 ring-amber-200">
                  <span className="size-1.5 rounded-full bg-sev-minor" /> Minor
                </span>
                <span className="ml-auto text-[10.5px] text-muted">Tiler</span>
              </div>
              <p className="mt-2 text-[13.5px] font-semibold leading-snug">Cracked floor tile by kitchen door</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                Hairline crack running diagonally across one 600×600 floor tile, approx. 300 mm from the threshold.
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="flex h-10 flex-1 items-center justify-center rounded-xl bg-brand-600 text-[12.5px] font-medium text-white">Accept</span>
              <span className="flex h-10 flex-1 items-center justify-center rounded-xl bg-surface text-[12.5px] font-medium border border-line">Edit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
