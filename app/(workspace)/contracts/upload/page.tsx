import { FilePicker } from "@/components/file-picker";
import { PageHeader, DemoNotice, SectionCard } from "@/components/ui";
export const metadata = { title: "Upload Contract" };
export default function UploadPage() {
  return <>
    <PageHeader eyebrow="A CLEARER START" title="Turn a document into a plan" description="Select a contract, policy, or agreement to preview the upload experience." />
    <DemoNotice>UI preview only. Document processing and AI analysis are not connected.</DemoNotice>
    <div className="two-col wide-left">
      <SectionCard title="Upload contract" subtitle="One document. A more structured way forward.">
        <FilePicker />
      </SectionCard>
      <SectionCard title="What happens next" subtitle="Planned workflow · not active in Phase 1">
        <ol className="process-list">{[["Document processing", "Extract the text and preserve references to the original pages."], ["AI analysis", "Identify potential obligations, deadlines, and clauses for review."], ["Compliance plan", "Review suggested owners, actions, and evidence requirements."], ["Start tracking", "Track progress and build a traceable evidence record."]].map(([title, text], i) => <li key={title}>
          <span>{i + 1}</span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </li>)}</ol>
        <p className="small-muted">The demo analysis uses a fictional grant agreement, independent of your selected file.</p>
      </SectionCard>
    </div>
  </>;
}
