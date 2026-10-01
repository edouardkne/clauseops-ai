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
      <SectionCard title="Your document workflow" subtitle="Phase 2A · Real extraction and AI analysis">
        <ol className="process-list">{[["Document processing · ACTIVE", "Read selectable PDF text in your browser and preserve original page numbers. PDF limit: 10 MB, 100 pages. OCR is not available."], ["AI analysis · ACTIVE", "On your request, analyse extracted text with OpenAI and check supporting quotes against the cited pages. Analysis limit: 250,000 characters total, 50,000 per page."], ["Compliance plan · NEXT", "Review interpreted responsibilities, timing, and evidence needs. Nothing is assigned automatically."], ["Start tracking · UPCOMING", "Persistent workflows and evidence verification are not yet connected."]].map(([title, text], i) => <li key={title}>
          <span>{i + 1}</span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </li>)}</ol>
        <p className="small-muted">Your result appears on this page and is cleared when you leave or refresh. The dashboard, reports, and demo agreement remain fictional and separate from your document.</p>
      </SectionCard>
    </div>
  </>;
}
