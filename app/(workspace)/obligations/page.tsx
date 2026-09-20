import { PageHeader, DemoNotice } from "@/components/ui";
import { ObligationTable } from "@/components/obligation-table";
import { obligations } from "@/mock-data";
export const metadata = { title: "Obligations" };
export default function ObligationsPage() {
  return <>
    <PageHeader eyebrow="FROM UNDERSTANDING TO ACTION" title="Obligations" description="Know what needs to happen, who owns it, and what proves it’s done." />
    <DemoNotice />
    <div className="card">
      <ObligationTable items={obligations} />
    </div>
    <p className="bottom-note">Confidence describes the demo interpretation. Status describes the tracking state. Neither is a legal conclusion.</p>
  </>;
}
