import { DemoNotice, PageHeader, SectionCard, StatusBadge } from "@/components/ui";
export const metadata = { title: "Settings" };
export default function SettingsPage() {
  return <>
    <PageHeader eyebrow="WORKSPACE PREFERENCES" title="Settings" description="A transparent view of this demo workspace and its capabilities." />
    <DemoNotice>Read-only preview. No account, authentication, settings persistence, or integrations are connected.</DemoNotice>
    <div className="two-col">
      <SectionCard title="Workspace" subtitle="Illustrative organisation profile">
        <dl className="detail-grid">
          <div>
            <dt>Workspace name</dt>
            <dd>Ubuntu Community Foundation</dd>
          </div>
          <div>
            <dt>Administrator</dt>
            <dd>Amara Okafor · Demo persona</dd>
          </div>
          <div>
            <dt>Display language</dt>
            <dd>English</dd>
          </div>
          <div>
            <dt>Demo snapshot</dt>
            <dd>20 September 2026</dd>
          </div>
        </dl>
      </SectionCard>
      <SectionCard title="Integration status" subtitle="Frontend foundation only">
        <div className="settings-list">{["Document processing", "AI analysis", "Evidence storage", "Chainlink CRE verification", "Notifications & calendar sync"].map(s => <div key={s}>
          <span>{s}</span>
          <StatusBadge status="Not connected" />
        </div>)}</div>
      </SectionCard>
    </div>
  </>;
}
