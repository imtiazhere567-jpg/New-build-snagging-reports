"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Inbox, Send, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import { Dropdown } from "@/components/ui/dropdown";
import { useStore } from "@/lib/data/store";
import { TRADE_LABEL } from "@/lib/constants";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRADES = Object.keys(TRADE_LABEL) as Trade[];

export function AddMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const users = useStore((s) => s.users);
  const addTeamMember = useStore((s) => s.addTeamMember);
  const emails = useMemo(() => users.map((u) => u.email.toLowerCase()), [users]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [trade, setTrade] = useState<Trade>("plumber");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const errors = {
    name: name.trim() ? undefined : "Enter their name",
    email: !EMAIL.test(email.trim()) ? "Enter a valid email address" : emails.includes(email.trim().toLowerCase()) ? "Someone with this email already has an account" : undefined,
  };
  const valid = !errors.name && !errors.email;

  const close = () => {
    onClose();
    setTimeout(() => {
      setName("");
      setEmail("");
      setPhone("");
      setTrade("plumber");
      setTouched(false);
      setDone(null);
    }, 50);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    addTeamMember({ name: name.trim(), email: email.trim(), phone: phone.trim(), trade });
    setDone(name.trim());
  };

  const input = (err?: string) =>
    cn(
      "h-10 w-full rounded-xl border bg-surface px-3 text-[14px] outline-none placeholder:text-faint focus:ring-2",
      err && touched ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "border-line-strong hover:border-faint focus:border-brand-500 focus:ring-brand-500/15",
    );

  if (done) {
    return (
      <Modal open={open} onClose={close} title="Team member added" icon={<CheckCircle2 className="size-5 text-brand-600" />}>
        <div className="py-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600">
            <Send className="size-6" />
          </div>
          <p className="mt-4 text-[16px] font-semibold">{done} is on the team</p>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-muted">
            We emailed them a sign-in link. New {TRADE_LABEL[trade].toLowerCase()} jobs can now be auto-assigned to them.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/contractor/inbox" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-sunken">
              <Inbox className="size-4" /> See the email
            </Link>
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      icon={<UserPlus className="size-5" />}
      title="Add a team member"
      description="They'll get an email with a sign-in link and see only the jobs assigned to them."
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" form="member-form"><Send className="size-4" /> Add & send invite</Button>
        </>
      }
    >
      <form id="member-form" onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam Fletcher" className={input(errors.name)} />
          {touched && errors.name && <span className="mt-1 block text-[12px] text-red-600">{errors.name}</span>}
        </label>
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Trade</span>
          <Dropdown
            label="Trade"
            value={trade}
            onChange={(v) => setTrade(v as Trade)}
            menuWidth={260}
            options={TRADES.map((t) => ({ value: t, label: TRADE_LABEL[t] }))}
          />
          <span className="mt-1 block text-[12px] text-muted">Snags for this trade are auto-assigned to the least-busy matching member.</span>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.co.uk" className={input(errors.email)} />
          {touched && errors.email && <span className="mt-1 block text-[12px] text-red-600">{errors.email}</span>}
        </label>
        <label className="block">
          <span className="mb-1.5 flex justify-between text-[13px] font-medium text-ink-2">Mobile <span className="text-[11.5px] font-normal text-faint">Optional</span></span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07700 900 000" className={input()} />
        </label>
      </form>
    </Modal>
  );
}
