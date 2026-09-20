import { notFound } from "next/navigation";
import { ObligationDetail } from "@/components/obligation-detail";
import { obligations } from "@/mock-data";
export function generateStaticParams() { return obligations.map(o => ({ id: o.id })); }
export default async function ObligationPage({ params }: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params; const obligation = obligations.find(o => o.id === id); if(!obligation)
    notFound(); return <ObligationDetail obligation={obligation} />;
}
