import { AssistantChat } from "@/components/assistant-chat";
import { DemoNotice, PageHeader } from "@/components/ui";
export const metadata = { title: "AI Assistant" };
export default function AssistantPage() {
  return <>
    <PageHeader eyebrow="RESEARCH & COMPLIANCE" title="Ask. Understand. Act." description="Find the requirement, understand the context, and return to the source." />
    <DemoNotice>UI-only assistant. All responses are scripted demo content, not legal advice or live AI output.</DemoNotice>
    <AssistantChat />
  </>;
}
