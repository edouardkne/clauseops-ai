import Link from "next/link";
import { Icon } from "@/components/icon";
import { DemoNotice, PageHeader, StatCard } from "@/components/ui";
import { ComplianceStatusCard, ReadinessCard, RecentActivity, UpcomingDeadlines } from "@/components/compliance";
import { summary } from "@/mock-data";
export const metadata = { title: "Dashboard" };
export default function Dashboard() {
  return <>
    <PageHeader eyebrow="YOUR COMPLIANCE COMMAND CENTRE" title="A clearer view. A confident next step." description="Welcome back, Amara. Here’s where your obligations stand." action={<Link className="button primary" href="/contracts/upload">
      <Icon name="upload" size={17} /> Upload contract</Link>} />
    <DemoNotice />
    <div className="stats-grid">
      <StatCard label="Active Contracts" value={summary.activeContracts} note="1 additional contract in review" icon="file" />
      <StatCard label="Total Obligations" value={summary.total} note="Across 4 documents" icon="check" tone="violet" />
      <StatCard label="Completed" value={summary.completed} note="40% of all obligations" icon="shield" tone="green" />
      <StatCard label="Pending" value={summary.pending} note="Includes due soon & in review" icon="clock" tone="amber" />
      <StatCard label="Overdue" value={summary.overdue} note="Needs your attention" icon="alert" tone="red" />
    </div>
    <div className="two-col">
      <ComplianceStatusCard />
      <ReadinessCard />
    </div>
    <div className="two-col wide-left">
      <UpcomingDeadlines />
      <RecentActivity />
    </div>
    <div className="insight-banner">
      <span className="icon-tile violet">
        <Icon name="spark" />
      </span>
      <div>
        <strong>Every obligation has a story. Start with the source.</strong>
        <p>Explore how a clause becomes an owner, a deadline, and an evidence requirement.</p>
      </div>
      <Link href="/contracts/demo" className="button secondary">Explore demo <Icon name="arrow" size={16} />
      </Link>
    </div>
  </>;
}
