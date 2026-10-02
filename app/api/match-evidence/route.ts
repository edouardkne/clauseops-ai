import { handleEvidenceRequest } from "../../../lib/evidence/handler";
import { matchEvidenceWithOpenAI } from "../../../lib/evidence/openai";
export const runtime = "nodejs";
export const maxDuration = 150;
export async function POST(request: Request) { return handleEvidenceRequest(request, matchEvidenceWithOpenAI); }
