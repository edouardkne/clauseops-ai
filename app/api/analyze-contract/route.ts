
import { handleAnalysisRequest } from "../../../lib/ai/handler";
import { analyzeContractWithOpenAI } from "../../../lib/ai/openai";
import { requireApiUser } from "../../../lib/supabase/api-auth";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: Request) {
  const authError = await requireApiUser();

  if (authError) return authError;

  return handleAnalysisRequest(request, analyzeContractWithOpenAI);
}
