
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AnalysisSessionProvider } from "@/components/analysis-session";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, organization")
    .eq("id", userId)
    .maybeSingle();

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : "Signed-in account";

  return (
    <AnalysisSessionProvider>
      <AppShell
        account={{
          email,
          fullName: profile?.full_name ?? null,
          organization: profile?.organization ?? null,
        }}
      >
        {children}
      </AppShell>
    </AnalysisSessionProvider>
  );
}
