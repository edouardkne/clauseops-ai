"use client";

import { useRef, useState } from "react";
import { useAnalysisSession } from "./analysis-session";
import { SectionCard } from "./ui";
import { createReceipt } from "@/lib/receipts/snapshot";
import type { ComplianceReceipt } from "@/lib/receipts/core";
import type { AnalysisSession } from "@/lib/intelligence/types";

export function ReceiptPreview() {
  const { current, intelligence } = useAnalysisSession();
  const [saved, setSaved] = useState<{ session: AnalysisSession; asOf: string; receipt: ComplianceReceipt } | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState(false);
  if (!current || !intelligence) return null;
  const receipt = saved?.session === current && saved.asOf === intelligence.asOf ? saved.receipt : null;
  async function generate() {
    if (!current || !intelligence || lock.current) return;
    lock.current = true; setBusy(true); setError(false);
    try {
      const receipt = await createReceipt(current, intelligence.asOf, new Date().toISOString());
      setSaved({ session: current, asOf: intelligence.asOf, receipt });
    } catch { setError(true); }
    finally { lock.current = false; setBusy(false); }
  }
  return <SectionCard title="Compliance Receipt" subtitle="LOCAL SNAPSHOT · Integrity foundation">
    <div className="receipt-preview">
      <p className="badge amber">Verification not yet submitted to Chainlink CRE</p>
      <p className="small-muted">Create a session-only snapshot of operational metadata. Hashes help detect changes; they do not establish document authenticity, human approval, or legal compliance. Nothing is sent to CRE.</p>
      {!receipt && <button type="button" className="button secondary" disabled={busy} onClick={generate}>{busy ? "Creating local snapshot…" : saved ? "Regenerate receipt preview" : "Create receipt preview"}</button>}
      {saved && !receipt && <p role="status" className="small-muted">The session changed. Create a new snapshot to reflect the current state.</p>}
      {error && <p role="alert">The local snapshot could not be created. Review the session and try again.</p>}
      {receipt && <div aria-live="polite">
        <dl className="detail-grid">
          <div><dt>Receipt ID</dt><dd>{receipt.receiptId}</dd></div>
          <div><dt>Created (UTC)</dt><dd>{receipt.createdAt}</dd></div>
          <div><dt>Document fingerprint</dt><dd>{receipt.documentFingerprint.slice(0, 20)}…</dd></div>
          <div><dt>Obligations included</dt><dd>{receipt.obligations.length}</dd></div>
          <div><dt>Accepted evidence links</dt><dd>{receipt.acceptedEvidenceLinks.length}</dd></div>
          <div><dt>Unresolved reviews</dt><dd>{receipt.unresolvedReviewCount}</dd></div>
          <div><dt>Local receipt hash · SHA-256</dt><dd>{receipt.canonicalPayloadHash}</dd></div>
          <div><dt>Status evaluated as of</dt><dd>{receipt.statusAsOf} UTC</dd></div>
        </dl>
        <p className="small-muted">Fingerprint identifies the filename and extracted pages, not the PDF binary. No obligation approval is recorded by this version. Evidence review decisions remain separate.</p>
      </div>}
    </div>
  </SectionCard>;
}
