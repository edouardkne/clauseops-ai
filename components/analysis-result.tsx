import type { VerifiedContractAnalysis } from "@/lib/ai/contract-analysis-schema";
import { Icon } from "./icon";
import { EmptyState, SectionCard } from "./ui";
import { disclaimer } from "@/mock-data";

const confidenceLabels = { direct: "Direct", inferred: "Inferred", uncertain: "Uncertain" };

export function AnalysisResult({ analysis, filename, pageCount }: {
  analysis: VerifiedContractAnalysis;
  filename: string;
  pageCount: number;
}) {
  const counts = [
    ["Obligations found", analysis.obligations.length],
    ["Direct", analysis.obligations.filter(o => o.confidence === "direct").length],
    ["Inferred", analysis.obligations.filter(o => o.confidence === "inferred").length],
    ["Needs human review", analysis.obligations.filter(o => o.needsHumanReview).length],
    ["Citations verified", analysis.obligations.filter(o => o.sourceVerified).length],
  ];
  return <section className="analysis-result" aria-label="Analysis of your document">
    <div className="analysis-heading">
      <div><div className="eyebrow">YOUR DOCUMENT · AI ANALYSIS</div><h2>{analysis.documentTitle}</h2></div>
      <span className="badge violet">Session only · Not saved</span>
    </div>
    <p className="small-muted">This result comes from your extracted document text. It is separate from the fictional demo workspace.</p>
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
    <dl className="analysis-counts">{counts.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
    {analysis.warnings.length > 0 && <SectionCard title="Analysis warnings" subtitle="REVIEW STATUS · Consider these limitations before acting">
      <ul className="analysis-list">{analysis.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
    </SectionCard>}
    {!analysis.obligations.length && <EmptyState title="No operational obligations identified" description="The analysis found no meaningful operational obligations in the extracted text. This is not a failure or a legal conclusion. Check the page preview and review the original document if you expected requirements." />}
    {analysis.obligations.map((obligation, index) => <article className="card analysis-obligation" key={obligation.id}>
      <div className="analysis-heading">
        <h3>{index + 1}. {obligation.title}</h3>
        <div className="analysis-badges">
          <span className={`badge ${obligation.confidence === "direct" ? "blue" : obligation.confidence === "inferred" ? "violet" : "amber"}`}>{confidenceLabels[obligation.confidence]}</span>
          {obligation.needsHumanReview && <span className="badge amber"><Icon name="alert" size={12} />Needs Review</span>}
        </div>
      </div>
      <div className="eyebrow">AI INTERPRETATION</div>
      <p className="analysis-action"><strong>Action:</strong> {obligation.action}</p>
      <p className="body-copy">{obligation.description}</p>
      <dl className="detail-grid">
        <div><dt>Responsible party</dt><dd>{obligation.responsibleParty || "Not specified — confirm responsibility"}</dd></div>
        <div><dt>Category</dt><dd className="capitalize">{obligation.category.replaceAll("_", " ")}</dd></div>
        <div><dt>Deadline / conditions</dt><dd>{obligation.deadlineText || "Not specified in the source"}</dd></div>
        <div><dt>Recurrence</dt><dd>{obligation.recurrence || "Not specified in the source"}</dd></div>
      </dl>
      <h4>Evidence required</h4>
      {obligation.evidenceRequired.length ? <ul className="analysis-list">{obligation.evidenceRequired.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="small-muted">No explicit evidence requirement identified. Confirm suitable supporting records with the responsible team.</p>}
      <div className="analysis-source">
        <div className="analysis-heading"><div className="eyebrow">SOURCE · PAGE {obligation.source.pageNumber}</div>
          <span className={`badge ${obligation.sourceVerified ? "green" : "red"}`}><Icon name={obligation.sourceVerified ? "check" : "alert"} size={13} />{obligation.sourceVerified ? "Quote matched to page" : "Quote not verified"}</span>
        </div>
        <blockquote>{obligation.source.quote}</blockquote>
        <p className="small-muted">A verified citation means this quote appears in the extracted page text. It does not verify the interpretation, evidence, or legal compliance.</p>
      </div>
      <div className="analysis-review"><div className="eyebrow">REVIEW STATUS</div><p>{obligation.needsHumanReview ? obligation.reviewReason : "No specific ambiguity was flagged. Review the interpretation and complete source before acting; this is not human approval."}</p></div>
    </article>)}
    <p className="analysis-disclaimer">{disclaimer}</p>
  </section>;
}
