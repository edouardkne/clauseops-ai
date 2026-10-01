import { handleAnalysisRequest } from "../../../lib/ai/handler";
import { analyzeContractWithOpenAI } from "../../../lib/ai/openai";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: Request) {
  return handleAnalysisRequest(request, analyzeContractWithOpenAI);
}
