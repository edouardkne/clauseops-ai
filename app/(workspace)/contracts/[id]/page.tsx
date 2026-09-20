import { notFound } from "next/navigation";
import { ContractDetail } from "@/components/contract-detail";
import { contracts } from "@/mock-data";
export function generateStaticParams() { return contracts.map(c => ({ id: c.id })); }
export default async function ContractPage({ params }: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params; const contract = contracts.find(c => c.id === id); if(!contract)
    notFound(); return <ContractDetail contract={contract} />;
}
