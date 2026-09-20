import { DemoNotice, PageHeader, SectionCard } from "@/components/ui";
import { ComplianceTimeline } from "@/components/compliance";
export const metadata = { title: "Calendar" };
export default function CalendarPage() {
  return <>
    <PageHeader eyebrow="PLAN YOUR NEXT STEP" title="Compliance calendar" description="A chronological agenda of deadlines and internal review targets." />
    <DemoNotice>September–October 2026 · Static demo agenda. No calendar sync or reminders are active.</DemoNotice>
    <SectionCard title="Deadline agenda" subtitle="All tracked obligations · includes completed milestones">
      <ComplianceTimeline />
    </SectionCard>
  </>;
}
