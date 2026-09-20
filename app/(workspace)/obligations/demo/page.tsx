import { ObligationDetail } from "@/components/obligation-detail";
import { obligations } from "@/mock-data";
export const metadata = { title: "Quarterly Financial Report" };
export default function DemoObligation() { return <ObligationDetail obligation={obligations[0]} />; }
