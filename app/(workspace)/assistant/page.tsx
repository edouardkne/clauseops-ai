import { AssistantChat } from "@/components/assistant-chat";
import { DemoNotice, PageHeader } from "@/components/ui";
export const metadata = { title: "AI Assistant" };
export default function AssistantPage() {
  return <>
    <PageHeader eyebrow="RESEARCH & COMPLIANCE" title="Ask. Understand. Act." description="Find the requirement, understand the context, and return to the source." />
    <DemoNotice>Current-contract lookups run locally with zero provider calls. Generative synthesis is not enabled. No legal advice or compliance verdicts.</DemoNotice>
    <AssistantChat />
  </>;
}
