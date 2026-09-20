import { ContractDetail } from "@/components/contract-detail";
import { contracts } from "@/mock-data";
export const metadata = { title: "Grant Agreement" };
export default function DemoContract() { return <ContractDetail contract={contracts[0]} />; }
