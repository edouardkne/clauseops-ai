import { DemoNotice, PageHeader, SectionCard, StatusBadge } from "@/components/ui";
export const metadata = { title: "Settings" };
export default function SettingsPage() {
  return <>
    <PageHeader eyebrow="WORKSPACE PREFERENCES" title="Settings" description="A transparent view of this demo workspace and its capabilities." />
    <DemoNotice>Read-only workspace settings. Real PDF extraction and AI analysis are available on the upload page; no account or settings persistence is connected.</DemoNotice>
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
      <SectionCard title="Integration status" subtitle="Phase 2A · Session-only document analysis">
        <div className="settings-list">
          <div><span>PDF text extraction</span><StatusBadge status="Active locally" /></div>
          <div><span>OpenAI analysis</span><StatusBadge status="On request" /></div>
          {["Evidence storage", "Chainlink CRE verification", "Notifications & calendar sync"].map(s => <div key={s}>
          <span>{s}</span>
          <StatusBadge status="Not connected" />
        </div>)}</div>
        <p className="small-muted">AI analysis requires server configuration. No credentials are displayed or stored in these settings.</p>
      </SectionCard>
    </div>
  </>;
}
