"use client";

import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, ChevronRight, Clock, FileCheck2, MapPin, PoundSterling, Send, Sparkles } from "lucide-react";
import { Avatar, ButtonLink, Card, Eyebrow, Progress, RefTag, SeverityBadge, StatusBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { useStore } from "@/lib/data/store";
import { propertyProgress, quoteTotals, userById } from "@/lib/data/queries";
import { cn, formatGBP, timeAgo } from "@/lib/utils";

export default function OwnerHome() {
  const state = useStore();
  const me = state.users.find((u) => u.id === state.currentUserId)!;
  const property = state.properties.find((p) => p.ownerId === me.id);
  if (!property) return <p className="text-muted">No home linked to this account.</p>;

  const report = state.reports
    .filter((r) => r.propertyId === property.id && r.status !== "draft")
    .sort((a, b) => b.version - a.version)[0];
  const snags = state.snags.filter((s) => s.propertyId === property.id);
  const quote = state.quotes.find((q) => q.propertyId === property.id);
  const prog = propertyProgress(snags);
  const toCheck = snags.filter((s) => s.status === "fixed");
  const drafts = snags.filter((s) => s.status === "ai_draft");
  const balanceDue = state.invoices.find((i) => i.propertyId === property.id && i.status === "unpaid");
  const updates = state.updates
    .filter((u) => u.propertyId === property.id && u.actorId !== me.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  const firstName = me.name.split(/\s|&/)[0];

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <p className="text-[13px] text-muted">Welcome home,</p>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{firstName}</h1>
      </div>

      {/* Home card */}
      <div className="relative overflow-hidden rounded-3xl bg-night bg-blueprint-dark p-5 text-white shadow-lift">
        <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-brand-500/30 blur-3xl" />
        <p className="text-[12px] font-medium text-white/50">{property.plot} · {property.development}</p>
        <p className="mt-1 text-[19px] font-semibold tracking-tight">{property.addressLine1}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-white/55"><MapPin className="size-3.5" /> {property.town}, {property.postcode}</p>
        {prog.total > 0 ? (
          <div className="mt-6">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-[13px] text-white/60">Snags fixed & verified</span>
              <span className="text-[28px] leading-none font-semibold tabular">
                {prog.verified}<span className="text-[16px] text-white/40">/{prog.total}</span>
              </span>
            </div>
            <Progress value={prog.percent} tone="light" />
          </div>
        ) : (
          <p className="mt-6 text-[13px] text-white/60">No snags reported yet.</p>
        )}
      </div>

      {/* Drafts waiting to be sent always come first */}
      {drafts.length > 0 && (
        <NextStep
          icon={Send}
          title={`${drafts.length} ${drafts.length === 1 ? "snag" : "snags"} ready to send`}
          body="Check what the AI wrote, then send them to your builder in one tap."
          href="/owner/snags"
          cta="Review & send"
        />
      )}

      {/* Stage-specific next step */}
      {!report && drafts.length === 0 && (
        <NextStep
          icon={Camera}
          title="Start your snag list"
          body="Walk round your home room by room and photograph anything that isn't right. Our AI writes each one up for you."
          href="/owner/capture"
          cta="Start capturing"
        />
      )}
      {report?.status === "submitted" && (
        <NextStep
          icon={Clock}
          tone="muted"
          title="Report sent to your contractor"
          body={`${snags.length} items sent ${timeAgo(report.submittedAt!)}. You'll get a quote by email, usually within 2 working days.`}
          href="/owner/snags"
          cta="View my snags"
        />
      )}
      {quote?.status === "sent" && (
        <NextStep
          icon={PoundSterling}
          title="Your quote is ready"
          body={`${quote.items.length} items · ${formatGBP(quoteTotals(quote).gross)} inc. VAT. Choose which items you'd like fixed and pay a ${quote.depositPercent}% deposit to book.`}
          href="/owner/billing"
          cta="Review quote"
        />
      )}
      {toCheck.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><FileCheck2 className="size-4" /></span>
            <div className="flex-1">
              <p className="text-[14.5px] font-semibold">{toCheck.length} {toCheck.length === 1 ? "fix" : "fixes"} to check</p>
              <p className="text-[12.5px] text-muted">Confirm the work is done, or send it back.</p>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {toCheck.map((s) => (
              <li key={s.id}>
                <Link href="/owner/snags" className="flex items-center gap-3 rounded-xl bg-canvas p-2 border border-line">
                  <SnagPhoto snag={s} className="size-12 shrink-0" rounded="rounded-lg" showBox={false} />
                  <div className="min-w-0 flex-1">
                    <RefTag>{s.ref}</RefTag>
                    <p className="mt-0.5 truncate text-[13.5px] font-medium">{s.title}</p>
                  </div>
                  <ChevronRight className="size-4 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {report?.status === "completed" && balanceDue && (
        <NextStep icon={PoundSterling} title="Final balance due" body={"Every snag is fixed and verified. Invoice " + balanceDue.number + " for " + formatGBP(balanceDue.amount) + " is ready to pay."} href="/owner/billing" cta="Pay balance" />
      )}
      {report?.status === "completed" && !balanceDue && (
        <NextStep icon={CheckCircle2} tone="muted" title="All done" body="Every accepted snag has been fixed and verified, and your final invoice is paid." href="/owner/billing" cta="View receipts" />
      )}

      {/* Updates */}
      {updates.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <Eyebrow>Latest from your contractor</Eyebrow>
            <Link href="/owner/updates" className="text-[12.5px] font-medium text-brand-700">See all</Link>
          </div>
          <Card className="divide-y divide-line">
            {updates.map((u) => {
              const actor = userById(state, u.actorId);
              const snag = snags.find((s) => s.id === u.snagId);
              return (
                <div key={u.id} className="flex gap-3 p-3.5">
                  {actor ? (
                    <Avatar user={actor} size={30} />
                  ) : (
                    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-brand-50"><Sparkles className="size-3.5 text-brand-600" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-medium">{actor?.name ?? "SnagSnap"}</p>
                      <span className="ml-auto shrink-0 text-[11px] text-faint">{timeAgo(u.createdAt)}</span>
                    </div>
                    <p className="text-[12.5px] text-muted">
                      <span className="font-mono">{snag?.ref}</span> · {snag?.title}
                    </p>
                    {u.note && <p className="mt-1 text-[13px] leading-snug text-ink-2">{u.note}</p>}
                    {u.toStatus && <div className="mt-1.5"><StatusBadge status={u.toStatus} /></div>}
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* Snapshot */}
      {snags.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <Eyebrow>Your snags</Eyebrow>
            <Link href="/owner/snags" className="text-[12.5px] font-medium text-brand-700">All {snags.length}</Link>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
            {snags.slice(0, 8).map((s) => (
              <div key={s.id} className="w-44 shrink-0 snap-start">
                <SnagPhoto snag={s} className="aspect-[4/3]" />
                <div className="mt-2 flex items-center gap-1.5">
                  <RefTag>{s.ref}</RefTag>
                  <SeverityBadge severity={s.severity} />
                </div>
                <p className="mt-1 line-clamp-2 text-[12.5px] font-medium leading-snug">{s.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NextStep({
  icon: Icon,
  title,
  body,
  href,
  cta,
  tone,
}: {
  icon: typeof Camera;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone?: "muted";
}) {
  return (
    <Card className={cn("p-4", tone !== "muted" && "ring-2 ring-brand-500/40")}>
      <div className="flex gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone === "muted" ? "bg-sunken text-ink-2" : "bg-brand-600 text-white")}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-[15px] font-semibold tracking-tight">{title}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{body}</p>
        </div>
      </div>
      <ButtonLink href={href} variant={tone === "muted" ? "secondary" : "primary"} className="mt-4 w-full">
        {cta} <ArrowRight className="size-4" />
      </ButtonLink>
    </Card>
  );
}
