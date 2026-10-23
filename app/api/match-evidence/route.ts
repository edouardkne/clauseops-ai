
import { handleEvidenceRequest } from "../../../lib/evidence/handler";
import { matchEvidenceWithOpenAI } from "../../../lib/evidence/openai";
import { requireApiUser } from "../../../lib/supabase/api-auth";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: Request) {
  const authError = await requireApiUser();

  if (authError) return authError;

  return handleEvidenceRequest(request, matchEvidenceWithOpenAI);
}
