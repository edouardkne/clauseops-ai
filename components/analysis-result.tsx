"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { EmptyState, SectionCard, StatusBadge } from "./ui";
import { useAnalysisSession } from "./analysis-session";
import { disclaimer } from "@/mock-data";

const confidenceLabels = { direct: "Direct", inferred: "Inferred", uncertain: "Uncertain" };

export function AnalysisResult() {
  const { current, intelligence, graph, recordCompletion, refreshDate } = useAnalysisSession();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  if (!current || !intelligence || !graph) return null;
  const { analysis, filename, pageCount } = current;
  const { summary } = intelligence;
  const counts = [
    ["Obligations found", summary.total], ["Direct", summary.direct], ["Inferred", summary.inferred],
    ["Uncertain", summary.uncertain], ["Needs human review", summary.needsReview],
    ["Citations verified", summary.verified], ["Citations unverified", summary.unverified],
    ["With deadline wording", summary.withDeadlines], ["Require evidence", summary.requiringEvidence],
    ["Missing responsible party", summary.missingResponsibleParty], ["Without a clear calendar deadline", summary.withoutClearDeadline],
  ];
  const visible = intelligence.obligations.filter(o =>
    `${o.title} ${o.action} ${o.responsibleParty || ""}`.toLowerCase().includes(query.toLowerCase()) &&
    (filter === "all" || (filter === "review" ? o.reviewRequired : filter === "payment" ? o.category === "payment" : filter === "evidence" ? o.evidenceRequired.length > 0 : o.operationalStatus === filter)),
  );
  return <section className="analysis-result" aria-label="Analysis of your document">
    <div className="analysis-heading">
      <div><div className="eyebrow">YOUR DOCUMENT · OBLIGATION INTELLIGENCE</div><h2>{analysis.documentTitle}</h2></div>
      <span className="badge violet">Session only · Not persisted</span>
    </div>
    <p className="small-muted">Review the source, interpretation and operational state below. Counts, statuses and review flags are calculated locally.</p>
    <Link href="/assistant" className="button secondary"><Icon name="spark" size={17} />Ask about this contract · No AI call</Link>
    <SectionCard title="Document summary" subtitle="AI INTERPRETATION · Check against the full document">
      <dl className="detail-grid">
        <div><dt>Filename</dt><dd>{filename}</dd></div>
        <div><dt>Detected title</dt><dd>{analysis.documentTitle}</dd></div>
        <div><dt>Document type</dt><dd>{analysis.documentType}</dd></div>
        <div><dt>Language</dt><dd>{analysis.language}</dd></div>
        <div><dt>Pages supplied</dt><dd>{pageCount}</dd></div>
        <div><dt>Parties</dt><dd>{analysis.parties.length ? analysis.parties.join(" · ") : "No named parties identified"}</dd></div>
      </dl>
      <p className="body-copy">{analysis.summary}</p>
    </SectionCard>
    <SectionCard title="Intelligence Summary" subtitle="Deterministic counts · No provider calls">
      <dl className="analysis-counts">{counts.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
      <p className="small-muted intelligence-note">Deadline wording includes relative or ambiguous terms. A clear calendar deadline requires a valid standalone ISO date without recurrence. Missing information stays missing.</p>
      <p className="small-muted">{graph.nodes.length} graph nodes · {graph.edges.length} explicit relationships: document, obligation, party, deadline, evidence requirement, and source. No inferred dependencies.</p>
    </SectionCard>
    <SectionCard title="Human Review Queue" subtitle={`${intelligence.reviewQueue.length} obligations need attention · Deterministic review rules`}>
      <div id="human-review" className="review-queue">
        {intelligence.reviewQueue.length ? intelligence.reviewQueue.map(o => <details key={o.id}>
          <summary>#{o.number} {o.title} <span className="badge amber">Needs Review</span></summary>
          <ul className="analysis-list">{o.reviewReasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>
          <a className="text-link" href={`#obligation-${o.id}`} onClick={() => { setFilter("all"); setQuery(""); }}>View obligation and source · Page {o.source.pageNumber}</a>
        </details>) : <p className="small-muted">No review flags were found by these rules. This is not human approval or a compliance conclusion.</p>}
      </div>
    </SectionCard>
    {analysis.warnings.length > 0 && <SectionCard title="Analysis warnings" subtitle="HUMAN REVIEW · Consider these limitations before acting">
      <ul className="analysis-list">{analysis.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
    </SectionCard>}
    <div id="real-obligations" className="intelligence-toolbar">
      <label>Find an obligation<input aria-label="Search real obligations" value={query} onChange={e => setQuery(e.target.value)} placeholder="Title, action, or party" /></label>
      <label>Filter obligations<select aria-label="Filter real obligations" value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">All obligations</option><option value="review">Needs human review</option><option value="payment">Payment category</option><option value="evidence">Requires evidence</option>
        {["Pending", "Due Soon", "Overdue", "Missing Evidence", "Completed"].map(status => <option key={status}>{status}</option>)}
      </select></label>
      <p className="small-muted" aria-live="polite">{visible.length} shown · Status as of {intelligence.asOf} UTC</p>
      <button className="text-link" type="button" onClick={refreshDate}>Refresh status date · Local only</button>
    </div>
    {!analysis.obligations.length ? <EmptyState title="No operational obligations identified" description="No meaningful operational obligations were found in the extracted text. Review the full source if you expected requirements; this is not a legal conclusion." /> : !visible.length && <EmptyState title="No matching obligations" description="Change the search or filter to see other obligations in this document." />}
    {visible.map(o => <article className="card analysis-obligation" id={`obligation-${o.id}`} key={o.id}>
      <div className="analysis-heading"><h3>{o.number}. {o.title}</h3><StatusBadge status={o.operationalStatus} /></div>
      <div className="eyebrow">AI INTERPRETATION</div>
      <p className="analysis-action"><strong>Action:</strong> {o.action}</p>
      <p className="body-copy">{o.description}</p>
      <dl className="detail-grid">
        <div><dt>Owned by</dt><dd>{o.responsibleParty?.trim() || "Not specified — confirm responsibility"}</dd></div>
        <div><dt>Category</dt><dd className="capitalize">{o.category.replaceAll("_", " ")}</dd></div>
        <div><dt>Deadline / original wording</dt><dd>{o.deadlineText?.trim() || "Not specified in the source"}</dd></div>
        <div><dt>Recurrence</dt><dd>{o.recurrence?.trim() || "Not specified in the source"}</dd></div>
      </dl>
      <h4>Requires evidence</h4>
      {o.evidenceRequired.length ? <ul className="analysis-list">{o.evidenceRequired.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="small-muted">No explicit evidence requirement identified.</p>}
      <div className="analysis-source">
        <div className="analysis-heading"><div className="eyebrow">SOURCE · PAGE {o.source.pageNumber}</div>
          <span className={`badge ${o.sourceVerified ? "green" : "red"}`}><Icon name={o.sourceVerified ? "check" : "alert"} size={13} />{o.sourceVerified ? "Verified source" : "Unverified source"}</span>
        </div>
        <blockquote>{o.source.quote}</blockquote>
        <p className="small-muted">A matched citation confirms text on the extracted page, not interpretation, evidence validity, or legal compliance.</p>
      </div>
      <div className="analysis-review operational-state">
        <div className="eyebrow">OPERATIONAL STATE · DETERMINISTIC</div>
        <StatusBadge status={o.operationalStatus} /><p>{o.statusReason}</p>
        <p>{o.mappedEvidenceCount} accepted evidence associations. These do not establish authenticity or legal sufficiency.</p>
        <ul className="analysis-list">{(current.state.evidence || []).filter(e => e.proposals.some(p => p.obligationId === o.id && p.decision === "accepted")).map(e => <li key={e.id}><Link href={`/evidence#evidence-${e.id}`}>{e.filename}</Link></li>)}</ul>
        <Link className="text-link" href="/evidence">Review evidence for this contract</Link>
        <label className="completion-control"><input type="checkbox" checked={o.completionRecorded} onChange={e => recordCompletion(o.id, e.target.checked)} />I have completed this task (session only)</label>
        <p>Recording completion does not clear review flags or missing evidence. It does not change the source or AI interpretation.</p>
      </div>
      <div className="analysis-review"><div className="eyebrow">HUMAN REVIEW</div>
        <div className="analysis-badges"><span className={`badge ${o.confidence === "direct" ? "blue" : "amber"}`}>{confidenceLabels[o.confidence]}</span>{o.reviewRequired && <span className="badge amber">Needs Review</span>}</div>
        {o.reviewRequired ? <ul className="analysis-list">{o.reviewReasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul> : <p>No specific ambiguity was flagged. Review the interpretation and complete source before acting.</p>}
      </div>
    </article>)}
    <p className="analysis-disclaimer">{disclaimer}</p>
  </section>;
}
