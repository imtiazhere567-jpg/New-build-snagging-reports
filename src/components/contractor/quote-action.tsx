"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, PoundSterling } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { Drawer, Modal } from "@/components/ui/overlay";
import { QuoteBuilder, QuoteSent } from "./quote-builder";
import { QuoteDetails } from "./quote-details";
import { useStore } from "@/lib/data/store";

/**
 * Primary action for a report.
 * No quote yet -> opens the quote builder in a wide side panel.
 * Quote exists -> opens the quote details in a popup.
 */
export function QuoteAction({ reportId, size }: { reportId: string; size?: "sm" | "md" }) {
  const quote = useStore((s) => s.quotes.find((q) => q.reportId === reportId));
  const property = useStore((s) => {
    const r = s.reports.find((x) => x.id === reportId);
    return s.properties.find((p) => p.id === r?.propertyId);
  });
  const [open, setOpen] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setSentId(null);
  };

  return (
    <>
      <Button size={size} variant={quote && !sentId ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        {quote ? `View quote ${quote.number}` : "Start quote"} <ArrowRight className="size-4" />
      </Button>

      {/* Existing quote -> details popup */}
      {quote && !sentId && (
        <Modal
          open={open}
          onClose={close}
          size="lg"
          icon={<PoundSterling className="size-5" />}
          title={`Quote ${quote.number}`}
          description={property ? `${property.addressLine1}, ${property.town}` : undefined}
          footer={
            <>
              <Link
                href={`/contractor/reports/${reportId}/quote`}
                className="mr-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
              >
                <ExternalLink className="size-3.5" /> Open full page
              </Link>
              <Button onClick={close}>Close</Button>
            </>
          }
        >
          <QuoteDetails quoteId={quote.id} />
        </Modal>
      )}

      {/* No quote yet -> builder in a wide side panel; success screen after sending */}
      {(!quote || sentId) && (
        <Drawer
          open={open}
          onClose={close}
          size="xl"
          icon={<PoundSterling className="size-5" />}
          title={sentId ? "Quote sent" : "New quote"}
          description={property ? `${property.addressLine1}, ${property.town} · ${property.plot}` : undefined}
        >
          {sentId ? <QuoteSent quoteId={sentId} onDone={close} /> : <QuoteBuilder reportId={reportId} onSent={setSentId} embedded />}
        </Drawer>
      )}
    </>
  );
}
