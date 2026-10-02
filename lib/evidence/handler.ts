import { AI_ANALYSIS_LIMITS } from "../ai/contract-analysis-schema";
import { BodyLimitError, readBoundedBody } from "../ai/handler";
import { AnalysisUnavailableError } from "../ai/errors";
import { EvidenceRequestSchema, type EvidenceRequest } from "./schema";
import { verifyEvidenceMatches } from "./logic";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });
export async function handleEvidenceRequest(request: Request, match: (input: EvidenceRequest, signal?: AbortSignal) => Promise<unknown>) {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return error("Expected JSON.", 415);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return error("This request is not allowed.", 403);
  if (Number(request.headers.get("content-length")) > AI_ANALYSIS_LIMITS.maxRequestBytes) return error("Evidence request is too large.", 413);
  let raw: unknown;
  try { raw = JSON.parse(await readBoundedBody(request)); }
  catch (caught) { return error(caught instanceof BodyLimitError ? "Evidence request is too large." : "Invalid JSON.", caught instanceof BodyLimitError ? 413 : 400); }
  const parsed = EvidenceRequestSchema.safeParse(raw);
  if (!parsed.success) return error("Invalid evidence request. Send extracted pages and one to eight unique obligation candidates within the text limits.", 400);
  try {
    const matches = verifyEvidenceMatches(await match(parsed.data, request.signal), parsed.data);
    return Response.json({ matches }, { headers });
  } catch (caught) {
    return error(caught instanceof AnalysisUnavailableError ? "AI matching is not configured on this server." : "Evidence matching could not finish. Review the evidence manually or try again.", 503);
  }
}
