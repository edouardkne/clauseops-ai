import { FilePicker } from "@/components/file-picker";
import { PageHeader, DemoNotice, SectionCard } from "@/components/ui";
export const metadata = { title: "Upload Contract" };
export default function UploadPage() {
  return <>
    <PageHeader eyebrow="A CLEARER START" title="Turn a document into a plan" description="Extract PDF text locally, then choose AI analysis to identify source-linked obligations." />
    <DemoNotice>Real document analysis · Session only. The PDF stays local; extracted text is sent to OpenAI only when you click Analyze with AI.</DemoNotice>
    <div className="two-col wide-left">
      <SectionCard title="Upload contract" subtitle="One document. A more structured way forward.">
        <FilePicker />
      </SectionCard>
      <SectionCard title="Your document workflow" subtitle="Phase 2B · Obligation intelligence">
        <ol className="process-list">{[["Document processing · ACTIVE", "Read selectable PDF text in your browser and preserve original page numbers. PDF limit: 10 MB, 100 pages. OCR is not available."], ["AI analysis · ON REQUEST", "Analyse extracted text with OpenAI and check supporting quotes. An unchanged document reuses its session analysis. Limit: 250,000 characters total, 50,000 per page."], ["Obligation intelligence · LOCAL", "Explore counts, review reasons, relationships, deterministic statuses, and source-grounded assistant answers without additional AI calls."], ["Tracking · SESSION ONLY", "Record task completion locally. Persistence and evidence attachment or verification are not yet connected."]].map(([title, text], i) => <li key={title}>
          <span>{i + 1}</span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </li>)}</ol>
        <p className="small-muted">Results stay in workspace memory across navigation and are removed on refresh or Clear analysis session. The dashboard, reports, and demo agreement remain fictional and separate from your document.</p>
      </SectionCard>
    </div>
  </>;
}
