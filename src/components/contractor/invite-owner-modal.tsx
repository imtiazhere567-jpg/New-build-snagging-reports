"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Inbox, Send, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/primitives";
import { useStore, type InviteOwnerInput } from "@/lib/data/store";
import { cn } from "@/lib/utils";

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const today = () => new Date().toISOString().slice(0, 10);

function blank(company: string): InviteOwnerInput {
  return {
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    town: "",
    postcode: "",
    plot: "",
    development: "",
    completionDate: today(),
    message: `Congratulations on your new home. We've set it up on SnagSnap so you can photograph anything that isn't quite right. Our AI writes up each item and sends it straight to ${company}.`,
  };
}

export function InviteOwnerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const company = useStore((s) => s.settings.name);
  const users = useStore((s) => s.users);
  const existingEmails = useMemo(() => users.map((u) => u.email.toLowerCase()), [users]);
  const inviteOwner = useStore((s) => s.inviteOwner);
  const [form, setForm] = useState<InviteOwnerInput>(() => blank(company));
  const [touched, setTouched] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const set = (k: keyof InviteOwnerInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const errors: Partial<Record<keyof InviteOwnerInput, string>> = {};
  if (!form.name.trim()) errors.name = "Enter the owner's name";
  if (!EMAIL.test(form.email.trim())) errors.email = "Enter a valid email address";
  else if (existingEmails.includes(form.email.trim().toLowerCase())) errors.email = "Someone with this email already has an account";
  if (!form.addressLine1.trim()) errors.addressLine1 = "Enter the first line of the address";
  if (!form.town.trim()) errors.town = "Enter the town";
  if (!UK_POSTCODE.test(form.postcode.trim())) errors.postcode = "Enter a UK postcode, e.g. HG2 7QT";
  if (!form.completionDate) errors.completionDate = "Choose a date";
  const valid = Object.keys(errors).length === 0;

  const close = () => {
    onClose();
    // Reset after the closing frame so the form doesn't flash.
    setTimeout(() => {
      setForm(blank(company));
      setTouched(false);
      setSentTo(null);
    }, 50);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    inviteOwner({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      plot: form.plot.trim() ? (/^plot/i.test(form.plot.trim()) ? form.plot.trim() : `Plot ${form.plot.trim()}`) : "Plot –",
      development: form.development.trim() || form.addressLine1.trim(),
    });
    setSentTo(form.email.trim());
  };

  const err = (k: keyof InviteOwnerInput) => (touched ? errors[k] : undefined);

  if (sentTo) {
    return (
      <Modal open={open} onClose={close} title="Invite sent" icon={<CheckCircle2 className="size-5 text-brand-600" />}>
        <div className="py-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600">
            <Send className="size-6" />
          </div>
          <p className="mt-4 text-[16px] font-semibold">{form.name} has been invited</p>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-muted">
            We emailed a sign-in link to <span className="font-medium text-ink">{sentTo}</span>. The home now appears in your list as “Invited”.
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
      size="lg"
      icon={<UserPlus className="size-5" />}
      title="Invite a home owner"
      description="They'll get an email with a secure link. No password needed."
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" form="invite-form">
            <Send className="size-4" /> Send invite
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={submit} noValidate className="space-y-5">
        <fieldset>
          <legend className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Home owner</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" error={err("name")} className="sm:col-span-2">
              <input value={form.name} onChange={set("name")} placeholder="e.g. Sarah & James Cooper" autoComplete="off" className={input(err("name"))} />
            </Field>
            <Field label="Email" error={err("email")}>
              <input type="email" value={form.email} onChange={set("email")} placeholder="name@example.co.uk" className={input(err("email"))} />
            </Field>
            <Field label="Mobile" hint="Optional">
              <input type="tel" value={form.phone} onChange={set("phone")} placeholder="07700 900 000" className={input()} />
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Property</legend>
          <div className="grid gap-3 sm:grid-cols-6">
            <Field label="Address line 1" error={err("addressLine1")} className="sm:col-span-6">
              <input value={form.addressLine1} onChange={set("addressLine1")} placeholder="e.g. 9 Larch Avenue" className={input(err("addressLine1"))} />
            </Field>
            <Field label="Town" error={err("town")} className="sm:col-span-3">
              <input value={form.town} onChange={set("town")} placeholder="e.g. Harrogate" className={input(err("town"))} />
            </Field>
            <Field label="Postcode" error={err("postcode")} className="sm:col-span-3">
              <input value={form.postcode} onChange={set("postcode")} placeholder="HG2 7QT" className={cn(input(err("postcode")), "uppercase")} />
            </Field>
            <Field label="Plot" hint="Optional" className="sm:col-span-2">
              <input value={form.plot} onChange={set("plot")} placeholder="e.g. 18" className={input()} />
            </Field>
            <Field label="Development" hint="Optional" className="sm:col-span-4">
              <input value={form.development} onChange={set("development")} placeholder="e.g. Meadowbrook Rise" className={input()} />
            </Field>
            <Field label="Completion date" error={err("completionDate")} className="sm:col-span-3">
              <DatePicker
                label="Completion date"
                value={form.completionDate}
                onChange={(v) => setForm((f) => ({ ...f, completionDate: v }))}
                error={!!err("completionDate")}
                triggerClassName="h-11"
              />
            </Field>
          </div>
        </fieldset>

        <Field label="Message in the email">
          <textarea rows={3} value={form.message} onChange={set("message")} className={cn(input(), "h-auto resize-none py-2.5 leading-relaxed")} />
        </Field>
      </form>
    </Modal>
  );
}

const input = (error?: string) =>
  cn(
    "h-10 w-full rounded-xl border bg-surface px-3 text-[14px] outline-none placeholder:text-faint focus:ring-2",
    error ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "border-line-strong hover:border-faint focus:border-brand-500 focus:ring-brand-500/15",
  );

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-ink-2">
        {label}
        {hint && <span className="text-[11.5px] font-normal text-faint">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-red-600">{error}</span>}
    </label>
  );
}
