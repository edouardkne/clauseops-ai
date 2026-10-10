"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAnalysisSession } from "./analysis-session";
export function WorkflowNav() {
  const path = usePathname(); const { current } = useAnalysisSession();
  if (!["/contracts/upload", "/evidence", "/assistant"].includes(path)) return null;
  return <nav className="workflow-nav" aria-label="Document workflow"><Link href="/contracts/upload">1. Contract & analysis</Link>{current && <><Link href="/contracts/upload#real-obligations">2. Obligations</Link><Link href="/contracts/upload#human-review">3. Human review</Link></>}<Link href="/evidence">4. Evidence</Link><Link href="/assistant">5. Assistant</Link></nav>;
}
