import Link from "next/link";
import { activity, obligations, summary } from "@/mock-data";
import { formatDate } from "@/lib/format";
import { Icon } from "./icon";
import { ProgressBar, SectionCard, StatusBadge } from "./ui";
export function ComplianceStatusCard() {
  return <SectionCard title="Compliance status" subtitle="A clear view of your tracked obligations" action={<span className="badge neutral">This snapshot</span>}>
    <div className="status-overview">
      <div className="donut" style={{ background: `conic-gradient(#5456d9 0% ${summary.readiness}%, #f0b75a ${summary.readiness}% 90%, #e1747d 90% 100%)` }} role="img" aria-label={`${summary.completed} completed, ${summary.pending} pending, ${summary.overdue} overdue`}>
        <div>
          <strong>{summary.readiness}%</strong>
          <span>completed</span>
        </div>
      </div>
      <div className="status-legend">{[["Completed", summary.completed, "indigo"], ["Pending & in review", summary.pending, "amber"], ["Overdue", summary.overdue, "red"]].map(([label, count, color]) => <div key={label}>
        <span className={`legend-dot ${color}`} />
        <span>{label}</span>
        <strong>{count}</strong>
      </div>)}<p>Tracking progress, not a legal compliance determination.</p>
      </div>
    </div>
  </SectionCard>;
}
export function ReadinessCard() {
  return <SectionCard title="Compliance readiness" subtitle="Make your next review easier" action={<Icon name="shield" />}>
    <ProgressBar label="Obligations completed" value={summary.readiness} note={`${summary.completed} of ${summary.total} tracked obligations completed`} />
    <ProgressBar label="Evidence readiness" value={summary.evidenceReadiness} note={`${summary.reviewedEvidence} obligations have reviewed demo evidence`} />
    <div className="inline-note">
      <Icon name="alert" size={18} />
      <p>One clause needs human review before its deadline can be confirmed.</p>
    </div>
    <Link className="text-link" href="/reports">View readiness report <Icon name="arrow" size={16} />
    </Link>
  </SectionCard>;
}
export function UpcomingDeadlines() {
  const upcoming = obligations.filter(o => o.status !== "Completed" && o.status !== "Overdue").sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3); return <SectionCard title="Upcoming deadlines" subtitle="Keep the next important dates in sight" action={<Link className="text-link" href="/calendar">View calendar <Icon name="arrow" size={15} />
  </Link>}>
    <div className="deadline-list">{upcoming.map(o => <Link key={o.id} href={`/obligations/${o.id === "1" ? "demo" : o.id}`} className="deadline-row">
      <div className="date-tile">
        <span>SEP</span>
        <strong>{o.deadline.slice(-2)}</strong>
      </div>
      <div className="deadline-copy">
        <strong>{o.title}</strong>
        <span>{o.owner} · {o.id === "7" ? "Internal review target" : o.category}</span>
      </div>
      <StatusBadge status={o.status} />
    </Link>)}</div>
  </SectionCard>;
}
export function RecentActivity() {
  return <SectionCard title="Recent activity" subtitle="Your workspace, in motion">
    <ol className="activity-list">{activity.map(a => <li key={a.id}>
      <span className="activity-icon">
        <Icon name={a.kind === "evidence" ? "upload" : a.kind === "review" ? "check" : "file"} size={16} />
      </span>
      <div>
        <p>
          <strong>{a.actor}</strong> {a.action} <span>{a.target}</span>
        </p>
        <small>{a.time}</small>
      </div>
    </li>)}</ol>
    <p className="small-muted">All activity shown is illustrative.</p>
  </SectionCard>;
}
export function ComplianceTimeline() {
  return <div className="timeline">{obligations.slice().sort((a, b) => a.deadline.localeCompare(b.deadline)).map(o => <div key={o.id}>
    <span className={`timeline-dot ${o.status === "Completed" ? "done" : ""}`} />
    <time dateTime={o.deadline}>{formatDate(o.deadline)}</time>
    <Link href={`/obligations/${o.id === "1" ? "demo" : o.id}`}>{o.title}</Link>
    <StatusBadge status={o.status} />
  </div>)}</div>;
}
