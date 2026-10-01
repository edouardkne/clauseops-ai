import { AI_ANALYSIS_LIMITS, AnalyzeContractRequestSchema, type AnalyzeContractRequest } from "./contract-analysis-schema";
import { AnalysisUnavailableError } from "./errors";
import { verifyAnalysis } from "./verify-sources";

type Analyzer = (input: AnalyzeContractRequest, signal?: AbortSignal) => Promise<unknown>;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });

class BodyLimitError extends Error {}

async function readBoundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  let bytes = 0;
  let body = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > AI_ANALYSIS_LIMITS.maxRequestBytes) {
        await reader.cancel();
        throw new BodyLimitError();
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function handleAnalysisRequest(request: Request, analyze: Analyzer) {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") return error("Expected an application/json request.", 415);
  // Browsers can only submit from this application; this is not authentication.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return error("This analysis request is not allowed.", 403);
  if (Number(request.headers.get("content-length")) > AI_ANALYSIS_LIMITS.maxRequestBytes) {
    return error("The analysis request is too large.", 413);
  }
  let unknownInput: unknown;
  try {
    unknownInput = JSON.parse(await readBoundedBody(request));
  } catch (caught) {
    return caught instanceof BodyLimitError
      ? error("The analysis request is too large.", 413)
      : error("Invalid JSON request.", 400);
  }
  const validated = AnalyzeContractRequestSchema.safeParse(unknownInput);
  if (!validated.success) {
    return error("Invalid analysis request. Send only a filename and up to 100 uniquely numbered pages, with at most 50,000 characters per page and 250,000 characters in total.", 400);
  }
  try {
    const rawAnalysis = await analyze(validated.data, request.signal);
    // Always verify here; neither the browser nor the model supplies trusted state.
    const analysis = verifyAnalysis(rawAnalysis, validated.data.pages);
    return Response.json({ analysis }, { status: 200, headers });
  } catch (caught) {
    if (caught instanceof AnalysisUnavailableError) return error("AI analysis is not configured on this server.", 503);
    // Never log or return provider errors, request text, stack traces, or credentials.
    return error("ClauseOps could not complete this analysis. Please try again or review the document manually.", 503);
  }
}
