"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ButtonLink } from "@/components/ui/primitives";
import { ExistingQuote, QuoteBuilder, QuoteSent } from "@/components/contractor/quote-builder";
import { useStore } from "@/lib/data/store";

/** Full-page fallback for the quote builder (the app normally opens it in a side panel). */
export default function QuoteBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const report = useStore((s) => s.reports.find((r) => r.id === id));
  const existing = useStore((s) => s.quotes.find((q) => q.reportId === id));
  const [sentId, setSentId] = useState<string | null>(null);

  if (!report) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Report not found.</p>
        <ButtonLink href="/contractor" variant="secondary" className="mt-4">Back to dashboard</ButtonLink>
      </div>
    );
  }
  if (sentId) return <QuoteSent quoteId={sentId} />;
  if (existing) return <ExistingQuote quoteId={existing.id} />;
  return <QuoteBuilder reportId={report.id} onSent={setSentId} />;
}
