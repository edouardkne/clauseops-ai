import { AppShell } from "@/components/app-shell";
import { AnalysisSessionProvider } from "@/components/analysis-session";
export default function WorkspaceLayout({ children }: {
  children: React.ReactNode;
}) { return <AnalysisSessionProvider><AppShell>{children}</AppShell></AnalysisSessionProvider>; }
