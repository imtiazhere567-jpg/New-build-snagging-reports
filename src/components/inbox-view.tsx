"use client";

import { isDemo } from "@/lib/config";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, CheckCheck, Inbox, MailOpen, Pencil, Search, X } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { Avatar, ButtonLink } from "@/components/ui/primitives";
import { Paginated } from "@/components/ui/pagination";
import { Dropdown } from "@/components/ui/dropdown";
import { useStore } from "@/lib/data/store";
import type { DemoEmail, Role } from "@/lib/types";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";

/* What an email is about, inferred from its tag or subject. */
type EmailType = "invite" | "signin" | "report" | "quote" | "invoice" | "reminder" | "job";
const TYPE_LABEL: Record<EmailType, string> = {
  invite: "Invites",
  signin: "Sign-in links",
  report: "New reports",
  quote: "Quotes",
  invoice: "Invoices & receipts",
  reminder: "Reminders",
  job: "Jobs",
};
function emailType(e: DemoEmail): EmailType {
  const s = e.subject.toLowerCase();
  if (e.kind || s.startsWith("reminder")) return "reminder";
  if (s.includes("sign-in")) return "signin";
  if (["new job", "sent back", "overdue jobs", "is fixed"].some((k) => s.includes(k))) return "job";
  if (s.includes("snag report")) return "report";
  if (s.includes("invoice") || s.includes("receipt")) return "invoice";
  if (s.includes("quote")) return "quote";
  return "invite";
}

const WHO: { key: "all" | Role | "unread"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "owner", label: "Home owners" },
  { key: "team", label: "Team" },
  { key: "contractor", label: "Contractor" },
];

/**
 * Demo inbox: in demo mode every email the system "sends", to anyone, lands here.
 * Used inside the contractor layout and as a standalone page for owners and team members.
 */
export function InboxView({ recipient }: { recipient?: { email: string; name: string } } = {}) {
  const emails = useStore((s) => s.emails);
  const users = useStore((s) => s.users);
  const company = useStore((s) => s.settings.name);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [who, setWho] = useState<(typeof WHO)[number]["key"]>("all");
  const [type, setType] = useState<"all" | EmailType>("all");

  const roleOf = useMemo(() => {
    const m = new Map(users.map((u) => [u.email.toLowerCase(), u]));
    return (e: DemoEmail) => m.get(e.to.toLowerCase());
  }, [users]);

  // A personal inbox only shows that person's emails
  const sorted = emails
    .filter((e) => !recipient || e.to.toLowerCase() === recipient.email.toLowerCase())
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const term = q.trim().toLowerCase();
  const matchWho = (e: DemoEmail, k: (typeof WHO)[number]["key"]) =>
    k === "all" ? true : k === "unread" ? !e.read : roleOf(e)?.role === k;
  const base = sorted.filter(
    (e) => (type === "all" || emailType(e) === type) && (!term || [e.to, e.subject, e.body, roleOf(e)?.name].some((v) => v?.toLowerCase().includes(term))),
  );
  const list = base.filter((e) => matchWho(e, who));
  const open = sorted.find((e) => e.id === openId) ?? null;
  const unread = sorted.filter((e) => !e.read).length;

  const select = (id: string) => {
    setOpenId(id);
    useStore.getState().markEmailsRead([id]);
  };
  const mine = new Set(sorted.map((e) => e.id));
  const markAllRead = () => useStore.getState().markEmailsRead([...mine]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{recipient || !isDemo ? "Inbox" : "Demo inbox"}</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-muted">
            {recipient
              ? `Emails sent to ${recipient.email}. In the demo nothing is really emailed; it all lands here.`
              : "In demo mode no real emails are sent. Every message the system would send, to anyone, lands here. Buttons inside an email sign you in as that person."}
          </p>
        </div>
        <button
          onClick={markAllRead}
          disabled={unread === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink-2 hover:bg-sunken disabled:opacity-40"
        >
          <CheckCheck className="size-4" /> Mark all read{unread ? ` (${unread})` : ""}
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-line bg-surface p-2 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search recipient, subject or message"
              aria-label="Search emails"
              className="h-10 w-full rounded-xl border border-transparent bg-canvas pr-9 pl-10 text-[14px] outline-none placeholder:text-faint focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-500/15"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-faint hover:text-ink" aria-label="Clear search">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Dropdown
            label="Type"
            value={type}
            onChange={(v) => setType(v as typeof type)}
            highlightWhenSet
            align="right"
            menuWidth={220}
            className="w-full sm:w-[200px]"
            options={[{ value: "all", label: "All types" }, ...(Object.keys(TYPE_LABEL) as EmailType[]).map((k) => ({ value: k, label: TYPE_LABEL[k] }))]}
          />
        </div>
        <div className={cn("mt-2 flex gap-1 overflow-x-auto border-t border-line px-0.5 pt-2 scrollbar-none", recipient && "hidden")} role="tablist" aria-label="Recipient">
          {WHO.map((w) => {
            const n = base.filter((e) => matchWho(e, w.key)).length;
            const activeTab = who === w.key;
            return (
              <button
                key={w.key}
                role="tab"
                aria-selected={activeTab}
                onClick={() => setWho(w.key)}
                className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition-colors", activeTab ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken")}
              >
                {w.label}
                <span className={cn("rounded px-1 text-[11px] tabular", activeTab ? "bg-white/15" : "bg-sunken text-muted")}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* List */}
        <div className={cn(open && "hidden lg:block")}>
          <Paginated
            key={`${who}|${type}|${term}`}
            items={list}
            pageSize={8}
            className="space-y-2"
            empty={
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-blueprint px-6 py-14 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-muted"><Inbox className="size-5" /></span>
                <p className="mt-3 font-medium">No emails here</p>
                <p className="mt-1 text-[13px] text-muted">Try another filter or clear the search.</p>
              </div>
            }
            render={(e) => {
              const to = roleOf(e);
              return (
                <button
                  key={e.id}
                  onClick={() => select(e.id)}
                  className={cn(
                    "w-full rounded-xl border p-3.5 text-left transition-colors",
                    e.id === openId ? "border-brand-400 bg-surface shadow-card" : "border-line bg-surface/70 hover:bg-surface",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {!e.read && <span className="size-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                    {to ? <Avatar user={to} size={18} /> : null}
                    <span className="truncate text-[12.5px] text-muted">{to ? to.name : e.to}</span>
                    <span className="ml-auto shrink-0 text-[11.5px] text-faint">{timeAgo(e.sentAt)}</span>
                  </div>
                  <p className={cn("mt-1 truncate text-[14px]", e.read ? "font-medium text-ink-2" : "font-semibold")}>{e.subject}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[12.5px] text-muted">{e.preview}</p>
                    <span className="shrink-0 rounded-md bg-sunken px-1.5 py-px text-[10.5px] font-medium text-ink-2">{TYPE_LABEL[emailType(e)]}</span>
                  </div>
                </button>
              );
            }}
          />
        </div>

        {/* Reader */}
        <div className={cn(!open && "hidden lg:block")}>
          {open ? (
            <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card animate-fade-up lg:sticky lg:top-20">
              <button onClick={() => setOpenId(null)} className="flex items-center gap-1.5 px-5 pt-4 text-[13px] text-muted lg:hidden">
                <ArrowLeft className="size-4" /> All emails
              </button>
              <div className="border-b border-line px-6 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-sunken px-1.5 py-px text-[11px] font-medium text-ink-2">{TYPE_LABEL[emailType(open)]}</span>
                  {open.sentById === "system" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-px text-[11px] font-medium text-ink-2"><Bot className="size-3" /> Sent automatically</span>
                  )}
                  {open.edited && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-px text-[11px] font-medium text-brand-700"><Pencil className="size-3" /> Edited by contractor</span>
                  )}
                </div>
                <h2 className="mt-2 text-[19px] font-semibold tracking-tight">{open.subject}</h2>
                <p className="mt-1 text-[13px] text-muted">
                  From <span className="text-ink-2">{company} via SnagSnap</span> · To <span className="text-ink-2">{roleOf(open)?.name ? `${roleOf(open)?.name} <${open.to}>` : open.to}</span> · {formatDateTime(open.sentAt)}
                </p>
              </div>
              <div className="bg-canvas px-4 py-8 sm:px-10">
                <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-7">
                  <LogoMark className="size-9" />
                  <div className="mt-5 text-[14.5px] leading-relaxed whitespace-pre-line text-ink-2">{open.body}</div>
                  {open.link && (
                    <ButtonLink href={open.link} size="lg" className="mt-6">
                      Open SnagSnap <ArrowRight className="size-4" />
                    </ButtonLink>
                  )}
                  <p className="mt-8 border-t border-line pt-4 text-[11.5px] text-faint">Sent by {company}. This link is unique to you and expires after use.</p>
                </div>
              </div>
            </article>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-blueprint px-6 py-20 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-muted"><MailOpen className="size-5" /></span>
              <p className="mt-3 font-medium">Select an email</p>
              <p className="mt-1 text-[13px] text-muted">Pick a message on the left to read it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
