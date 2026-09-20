import Link from "next/link";
import type { Obligation } from "@/types";
import { contracts, evidence, obligations } from "@/mock-data";
import { formatDate } from "@/lib/format";
import { ConfidenceBadge, DemoNotice, PageHeader, SectionCard, StatusBadge } from "./ui";
import { Icon } from "./icon";
export function ObligationDetail({ obligation: o }: {
  obligation: Obligation;
}) {
  const contract = contracts.find(c => c.id === o.contractId)!;
  const files = evidence.filter(e => e.obligationId === o.id);
  const related = obligations.filter(item => item.contractId === o.contractId && item.id !== o.id);
  const reason = o.status === "Completed" ? "The demo action is recorded as complete and has reviewed evidence." : o.status === "Overdue" ? "The fixed deadline precedes 20 September 2026 and completion is not recorded." : o.status === "Needs Review" ? "The source wording is ambiguous. A human review is required; the displayed date is an internal target." : o.status === "Missing Evidence" ? "The demo action is awaiting its required evidence attachment." : o.status === "Due Soon" ? "The deadline is within seven days of the demo snapshot and completion is not recorded." : "The deadline is more than seven days after the demo snapshot and completion is not recorded.";
  return <>
    <Link className="back-link" href="/obligations">← All obligations</Link>
    <PageHeader eyebrow={`OBL-${o.id.padStart(3, "0")} · ${contract.type.toUpperCase()}`} title={o.title} description={o.description} action={<StatusBadge status={o.status} />} />
    <DemoNotice />
    <div className="two-col wide-left">
      <div className="stack">
        <SectionCard title="Obligation details" subtitle="EXECUTE · Responsibility and timing">
          <dl className="detail-grid">
            <div>
              <dt>Owner</dt>
              <dd>{o.owner}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{o.category}</dd>
            </div>
            <div>
              <dt>{o.id === "7" ? "Internal review target" : "Deadline"}</dt>
              <dd>{formatDate(o.deadline)}</dd>
            </div>
            <div>
              <dt>Frequency</dt>
              <dd>{o.frequency}</dd>
            </div>
          </dl>
        </SectionCard>
        <SectionCard title="Exact source reference" subtitle="SOURCE · Fictional document excerpt" action={<span className="badge neutral">Page {o.source.page}</span>}>
          <Link href={`/contracts/${contract.id === "grant" ? "demo" : contract.id}`} className="text-link">
            <Icon name="file" size={16} />{contract.name}</Link>
          <h3 className="source-heading">§ {o.source.section}</h3>
          <blockquote>{o.source.quote}</blockquote>
          <p className="small-muted">Quoted verbatim from the fictional demo source. No original PDF is stored in this prototype.</p>
        </SectionCard>
        <SectionCard title="Evidence required" subtitle="VERIFY · Supporting records for this obligation">
          <ul className="evidence-checklist">{o.evidenceRequired.map(e => <li key={e}>
            <Icon name="file" size={18} />{e}</li>)}</ul>
          <p className="small-muted">{files.length} demo attachment{files.length !== 1 ? "s" : ""} linked. Review status is visible in the evidence vault.</p>
          <Link className="text-link" href="/evidence">Open evidence vault <Icon name="arrow" size={16} />
          </Link>
        </SectionCard>
      </div>
      <div className="stack">
        <SectionCard title="Deterministic compliance status" subtitle="COMPLIANCE STATE · Fixed demo snapshot">
          <StatusBadge status={o.status} />
          <p className="body-copy">{reason}</p>
          <div className="inline-note">
            <Icon name="clock" size={16} />
            <p>Evaluated against the fixed demo date: 20 September 2026. No live rules engine is running.</p>
          </div>
        </SectionCard>
        <SectionCard title="AI interpretation" subtitle="DEMO PLACEHOLDER · Human review required" action={<Icon name="spark" />}>
          <div className="flex items-center justify-between gap-3">
            <span className="small-muted">Interpretation confidence</span>
            <ConfidenceBadge confidence={o.confidence} />
          </div>
          <p className="body-copy">{o.id === "7" ? "‘Promptly’ does not specify a measurable notification window. Clarify the trigger and recipient before creating a contractual deadline." : "The sample interpretation maps this clause to an operational task. Confirm the scope, owner, and evidence requirements against the complete agreement."}</p>
          <p className="small-muted">Confidence is illustrative and separate from completion status.</p>
        </SectionCard>
        <SectionCard title="Related clauses" subtitle="Connected requirements in this document">{related.length ? <div className="related-list">{related.map(item => <Link key={item.id} href={`/obligations/${item.id === "1" ? "demo" : item.id}`}>
          <span>§ {item.source.section}</span>
          <Icon name="arrow" size={15} />
        </Link>)}</div> : <p className="small-muted">No other clauses in this demo extract.</p>}</SectionCard>
      </div>
    </div>
  </>;
}
