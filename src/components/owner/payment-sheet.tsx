"use client";

import { useState } from "react";
import { CreditCard, FlaskConical, Loader2, Lock } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import { formatGBP, cn } from "@/lib/utils";

/** Stripe's documented test cards: 4242… always succeeds, 4000 0000 0000 0002 is always declined. */
const DECLINE = "4000000000000002";

const luhn = (num: string) => {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
};

/**
 * Card payment popup. Behaves like a Stripe test-mode checkout; no real money moves in this demo.
 * In live mode this is where Stripe Elements / Checkout would sit.
 */
export function PaymentSheet({
  amount,
  title,
  description,
  onPaid,
  onClose,
}: {
  amount: number;
  title: string;
  description: string;
  onPaid: () => void;
  onClose: () => void;
}) {
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12 / 34");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = card.replace(/\D/g, "");
  const [mm, yy] = expiry.split("/").map((v) => Number(v.trim()));
  const expiryOk = mm >= 1 && mm <= 12 && yy >= 26;
  const valid = digits.length === 16 && luhn(digits) && expiryOk && /^\d{3,4}$/.test(cvc) && name.trim().length > 1;

  const pay = async () => {
    setError(null);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1300));
    setBusy(false);
    if (digits === DECLINE) {
      setError("Your card was declined. Try another card.");
      return;
    }
    onPaid();
  };

  const input = "h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-[14.5px] tabular outline-none placeholder:text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      icon={<CreditCard className="size-5" />}
      title={title}
      description={description}
      footer={
        <Button size="lg" className="w-full" disabled={!valid || busy} onClick={pay}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} {busy ? "Processing…" : `Pay ${formatGBP(amount)}`}
        </Button>
      }
    >
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-night bg-blueprint-dark p-4 text-white">
        <div>
          <p className="text-[12px] text-white/55">Amount due now</p>
          <p className="text-[26px] font-semibold tracking-tight tabular">{formatGBP(amount)}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-highlight/15 px-2.5 py-1 text-[11px] font-semibold text-highlight">
          <FlaskConical className="size-3.5" /> Test mode
        </span>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Card number</span>
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            value={card}
            onChange={(e) => setCard(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())}
            className={cn(input, digits.length === 16 && !luhn(digits) && "border-red-400")}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Expiry</span>
            <input
              inputMode="numeric"
              autoComplete="cc-exp"
              value={expiry}
              placeholder="MM / YY"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setExpiry(v.length > 2 ? `${v.slice(0, 2)} / ${v.slice(2)}` : v);
              }}
              className={cn(input, expiry.length >= 7 && !expiryOk && "border-red-400")}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">CVC</span>
            <input inputMode="numeric" autoComplete="cc-csc" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} className={input} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Name on card</span>
          <input autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hannah Price" className={input} />
        </label>
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-medium text-red-700">{error}</p>}

      <p className="mt-4 text-[12px] leading-relaxed text-muted">
        Demo: <span className="font-mono">4242 4242 4242 4242</span> succeeds, <span className="font-mono">4000 0000 0000 0002</span> is declined. Any future expiry and any CVC.
      </p>
    </Modal>
  );
}
