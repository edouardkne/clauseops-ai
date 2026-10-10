"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAnalysisSession } from "./analysis-session";
import { EmptyState, PageHeader, SectionCard } from "./ui";
import { Icon } from "./icon";
import type { AnalysisSession } from "@/lib/intelligence/types";
import type { SessionEvidence } from "@/lib/evidence/types";
import { candidateShortlist, createEvidence, evidenceNeedsReview, matchingKey, toCandidate } from "@/lib/evidence/logic";
import { EvidenceRequestSchema, EvidenceResultSchema } from "@/lib/evidence/schema";
import { AI_ANALYSIS_LIMITS } from "@/lib/ai/contract-analysis-schema";

export function EvidenceIntelligence({ current }: { current: AnalysisSession }) {
  const session = useAnalysisSession();
  const [upload, setUpload] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const alive = useRef(true);
  const busy = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const evidence = current.state.evidence || [];
  async function choose(file?: File) {
    if (!file || busy.current) return;
    busy.current = true; setExtracting(true); setError(""); setMessage("");
    try {
      const { extractPdfDocument } = await import("@/lib/pdf/extract");
      const document = await extractPdfDocument(file);
      const item = await createEvidence(document, current.analysis.obligations);
      if (!alive.current) return;
      session.addEvidence(current.key, item);
      setMessage(evidence.some(e => e.fingerprint === item.fingerprint) ? "Existing evidence reused. Previous decisions are preserved." : "Evidence extracted locally. No AI request sent.");
    } catch {
      if (alive.current) setError("This PDF could not be extracted. Use a readable, text-based PDF up to 10 MB and 100 pages. Scanned, encrypted or malformed PDFs are not supported; OCR is unavailable.");
    } finally { busy.current = false; if (alive.current) setExtracting(false); }
  }
  return <>
    <PageHeader eyebrow="THE RECORD BEHIND THE WORK" title="Evidence vault" description="AI proposes. User confirms. ClauseOps tracks." action={<button className="button primary" onClick={() => setUpload(!upload)} aria-expanded={upload} aria-controls="evidence-upload"><Icon name="upload" size={17} />{upload ? "Hide file picker" : "Add Evidence"}</button>} />
    <div className="inline-note"><Icon name="shield" size={18} /><p>Active contract: <strong>{current.filename}</strong>. Session only. Accepted associations do not establish legal sufficiency, authenticity, or compliance.</p></div>
    {upload && <div id="evidence-upload" className="upload-panel"><SectionCard title="Add evidence PDF" subtitle="Local extraction first · no automatic AI calls">
      <label className="evidence-dropzone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void choose(event.dataTransfer.files[0]); }}>
        <Icon name="upload" /><strong>Drop a text-readable PDF or choose a file</strong>
        <input aria-label="Choose evidence PDF" type="file" accept=".pdf,application/pdf" disabled={extracting} onChange={event => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
        <span>PDF only · 10 MB · 100 pages · no OCR</span>
      </label>
      <p className="small-muted">The PDF binary stays local. Only clicking Match Evidence with AI sends extracted evidence text and selected structured obligations through our server to OpenAI. No full contract is resent. Results and decisions live in workspace memory and clear on refresh or Clear analysis session. OpenAI data policies apply to text you choose to transmit.</p>
      <div aria-live="polite">{extracting && <p role="status">Extracting evidence locally…</p>}{message && <p role="status">{message}</p>}{error && <p role="alert" className="error-message">{error}</p>}</div>
    </SectionCard></div>}
    {!evidence.length && <EmptyState title="No evidence in this session" description="Add a PDF to see local candidates. Associations are created only after you accept a match." />}
    <div className="evidence-documents">{evidence.map(item => <EvidenceDocument key={item.id} evidence={item} current={current} />)}</div>
    <p className="analysis-disclaimer">ClauseOps assists with obligation tracking and compliance operations. It does not provide legal advice.</p>
  </>;
}

function EvidenceDocument({ evidence, current }: { evidence: SessionEvidence; current: AnalysisSession }) {
  const session = useAnalysisSession();
  const obligations = current.analysis.obligations;
  const [selected, setSelected] = useState<string[]>(() => candidateShortlist(evidence, obligations).filter(c => !evidence.proposals.some(p => p.obligationId === c.id && p.match === "strong")).map(c => c.id));
  const [matching, setMatching] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  async function match() {
    if (busy.current || !selected.length) return;
    setMessage(""); setError("");
    const parsed = EvidenceRequestSchema.safeParse({ evidence: { filename: evidence.filename, pages: evidence.pages.map(p => ({ pageNumber: p.pageNumber, text: p.text })) }, obligations: obligations.filter(o => selected.includes(o.id)).map(toCandidate) });
    if (!parsed.success) { setError("AI matching supports up to 8 candidates, 250,000 evidence characters total and 50,000 per page. Local preview remains available."); return; }
    busy.current = true; setMatching(true);
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort(), AI_ANALYSIS_LIMITS.timeoutMs + 10000);
    try {
      const key = `${current.key}:${await matchingKey(parsed.data)}`;
      if (!alive.current || abort.signal.aborted) return;
      let sent = false;
      const matches = await session.evidenceCache.run(key, async () => {
        sent = true;
        const response = await fetch("/api/match-evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data), cache: "no-store", signal: abort.signal });
        if (!response.ok) throw new Error("Matching unavailable");
        const result = EvidenceResultSchema.parse(await response.json());
        return result.matches;
      });
      if (!alive.current || abort.signal.aborted) return;
      session.proposeEvidence(current.key, evidence.id, matches);
      setMessage(sent ? matches.some(m => m.match !== "none") ? "Proposals ready. Review before accepting; no links were created automatically." : "No relevant matches found in the selected candidates. Review the evidence or choose other candidates." : "Existing matching result reused. No AI request sent. Your decisions are preserved.");
    } catch { if (alive.current) setError("Evidence matching could not finish. Your extracted evidence and decisions are preserved. Try again or review local proposals."); }
    finally { clearTimeout(timer); busy.current = false; if (alive.current) setMatching(false); }
  }
  return <article id={`evidence-${evidence.id}`} className="card evidence-document">
    <div className="analysis-heading"><div><div className="eyebrow">EVIDENCE DOCUMENT</div><h2>{evidence.filename}</h2></div><span className="badge green">Text extracted locally</span></div>
    <dl className="detail-grid"><div><dt>Type / size</dt><dd>{evidence.fileType} · {Math.ceil(evidence.size / 1024)} KB</dd></div><div><dt>Added</dt><dd>{new Date(evidence.addedAt).toLocaleString("en-GB")}</dd></div><div><dt>Text available</dt><dd>{evidence.pages.length} pages · {evidence.pages.reduce((n,p) => n+p.text.length,0).toLocaleString()} characters</dd></div><div><dt>Accepted associations</dt><dd>{evidence.proposals.filter(p => p.decision === "accepted").length}</dd></div></dl>
    <details className="evidence-preview"><summary>Preview extracted evidence pages</summary>{evidence.pages.map(page => <div key={page.pageNumber}><h4>Page {page.pageNumber}</h4><pre>{page.text || "No text on this page."}</pre></div>)}</details>
    <details className="evidence-candidates" open={!evidence.proposals.length}>
      <summary>Semantic matching candidates ({selected.length}/8 selected)</summary>
      <p className="small-muted">Local filename, category and requirement clues shortlist up to eight obligations. If no clue matches, select relevant candidates yourself. A shortlist can miss relevant obligations. Exact local proposals need no AI call.</p>
      <div className="candidate-list">{obligations.map((o,index) => <label key={o.id}><input type="checkbox" checked={selected.includes(o.id)} disabled={matching || (!selected.includes(o.id) && selected.length >= 8) || evidence.proposals.some(p => p.obligationId === o.id && p.method === "local" && p.match === "strong")} onChange={event => setSelected(previous => event.target.checked ? [...previous, o.id] : previous.filter(id => id !== o.id))} /><span>#{index+1} {o.title}</span></label>)}</div>
    </details>
    <button type="button" className="button primary" disabled={matching || !selected.length} onClick={() => void match()}>{matching ? "Matching evidence…" : "Match Evidence with AI"}</button>
    <div aria-live="polite" aria-busy={matching}>{matching && <p role="status">Checking relevance against the selected candidates…</p>}{message && <p role="status" className="small-muted">{message}</p>}{error && <p role="alert" className="error-message">{error}</p>}</div>
    <div className="evidence-matches">{evidence.proposals.map(proposal => {
      const obligation = obligations.find(o => o.id === proposal.obligationId);
      if (!obligation) return null;
      const review = evidenceNeedsReview(proposal);
      return <section key={proposal.obligationId} className="evidence-match" data-decision={proposal.decision}>
        <div className="eyebrow">{proposal.method === "ai" ? "AI INTERPRETATION · MATCH PROPOSAL" : "LOCAL INTERPRETATION · MATCH PROPOSAL"}</div>
        <div className="analysis-heading"><h3>{obligation.title}</h3><div className="analysis-badges"><span className="badge blue capitalize">{proposal.match}</span><span className={`badge ${proposal.decision === "accepted" ? "green" : "neutral"}`}>{proposal.decision}</span>{review && <span className="badge amber">Needs Review</span>}</div></div>
        <p>{proposal.explanation}</p>
        <div className="analysis-source"><div className="eyebrow">SOURCE · EVIDENCE PAGE {proposal.pageNumber}</div><blockquote>{proposal.supportingEvidenceQuote}</blockquote><span className={`badge ${proposal.quoteVerified ? "green" : "red"}`}>{proposal.quoteVerified ? "Verified source" : "Unverified source"}</span>
          {proposal.validityText && <p>Stated validity / expiry: {proposal.validityText} · {proposal.validityVerified ? "Wording matched; not an expiry assessment" : "Unverified wording"}</p>}
          <h4>Target obligation source · Page {obligation.source.pageNumber}</h4><blockquote>{obligation.source.quote}</blockquote><p className="small-muted">Contract quote: {obligation.sourceVerified ? "Verified source" : "Unverified source"}.</p>
          <Link className="text-link" href={`/contracts/upload#obligation-${obligation.id}`}>View obligation and operational state</Link>
        </div>
        <details className="evidence-review"><summary>HUMAN REVIEW · Review Match</summary><p>{proposal.reviewReason || "Check relevance, scope, parties and timing before accepting. Matching wording does not establish sufficiency."}</p>
          <p>Acceptance creates an association only. Ambiguous evidence keeps Needs Review until you explicitly confirm your review. Contract review flags remain independent.</p>
          {proposal.decision !== "rejected" && <button className="button secondary" disabled={!proposal.quoteVerified || !proposal.validityVerified || proposal.reviewed} onClick={() => session.decideEvidence(evidence.id, obligation.id, "review")}>{proposal.reviewed ? "Review recorded" : "Confirm relevance reviewed"}</button>}
        </details>
        <div className="evidence-actions"><button className="button secondary" disabled={proposal.decision !== "proposed" || !proposal.quoteVerified || !proposal.validityVerified} onClick={() => session.decideEvidence(evidence.id, obligation.id, "accept")}>Accept Match</button><button className="button secondary" disabled={proposal.decision === "rejected"} onClick={() => session.decideEvidence(evidence.id, obligation.id, "reject")}>Reject Match</button></div>
        {proposal.decision === "rejected" && <p className="small-muted">Rejected in this session. Reusing or reselecting this unchanged evidence will not restore the proposal.</p>}
      </section>;
    })}</div>
  </article>;
}
