import Link from "next/link";
import { PageHeader, DemoNotice } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ContractsList } from "@/components/contracts-list";
export const metadata = { title: "My Contracts" };
export default function ContractsPage() {
  return <>
    <PageHeader eyebrow="SOURCE DOCUMENTS" title="My contracts" description="The source of every obligation. Your agreements, in one place." action={<Link href="/contracts/upload" className="button primary">
      <Icon name="upload" size={17} />Upload Contract</Link>} />
    <DemoNotice />
    <ContractsList />
    <div className="bottom-note">
      <Icon name="link" size={17} />
      <span>Every demo obligation is linked to a specific clause and page in its fictional source document.</span>
    </div>
  </>;
}
