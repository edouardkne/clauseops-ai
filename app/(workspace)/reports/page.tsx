import Link from "next/link";
import { DemoNotice, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/ui";
import { ComplianceStatusCard, ComplianceTimeline, ReadinessCard } from "@/components/compliance";
import { ExportPlaceholder } from "@/components/export-placeholder";
import { obligations, summary } from "@/mock-data";
export const metadata = { title: "Compliance Report" };
export default function ReportsPage() {
  return <>
    <PageHeader eyebrow="PREPARED FOR THE NEXT REVIEW" title="Compliance report" description="Ubuntu Community Foundation · Snapshot: 20 September 2026" action={<ExportPlaceholder />} />
    <DemoNotice>Illustrative operational report. Readiness is a tracking metric, not a certification or guarantee of compliance.</DemoNotice>
    <div className="stats-grid four">
      <StatCard label="Overall readiness" value={`${summary.readiness}%`} note="Completed / total obligations" icon="chart" />
      <StatCard label="Completed" value={summary.completed} note="With reviewed demo evidence" icon="check" tone="green" />
      <StatCard label="Pending" value={summary.pending} note="Includes due soon & in review" icon="clock" tone="amber" />
      <StatCard label="Overdue" value={summary.overdue} note="Outstanding at snapshot date" icon="alert" tone="red" />
    </div>
    <div className="two-col">
      <ComplianceStatusCard />
      <ReadinessCard />
    </div>
    <div className="two-col wide-left">
      <SectionCard title="Compliance timeline" subtitle="Contract dates and internal review targets">
        <ComplianceTimeline />
      </SectionCard>
      <SectionCard title="Risk areas" subtitle="Priorities for operational review">
        <div className="report-risks">{obligations.filter(o => ["Overdue", "Needs Review", "Missing Evidence"].includes(o.status)).map(o => <div key={o.id}>
          <StatusBadge status={o.status} />
          <h3>
            <Link href={`/obligations/${o.id}`}>{o.title}</Link>
          </h3>
          <p>{o.description}</p>
        </div>)}</div>
        <p className="small-muted">No independent verification has been performed. Metrics are derived from the central mock dataset.</p>
      </SectionCard>
    </div>
  </>;
}
