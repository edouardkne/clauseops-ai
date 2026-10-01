import assert from "node:assert/strict";
import { test } from "node:test";
import { handleAnalysisRequest } from "../lib/ai/handler";
import { createModelAnalyzer, readConfiguration, SYSTEM_INSTRUCTIONS } from "../lib/ai/model";
import { verifyAnalysis, verifySourceQuote } from "../lib/ai/verify-sources";
import { AI_ANALYSIS_LIMITS, ContractAnalysisSchema, type ContractAnalysis } from "../lib/ai/contract-analysis-schema";

const text = "The Supplier shall submit a monthly report within five days after month end.";
const input = { filename: "Supplier.pdf", pages: [{ pageNumber: 1, text }] };
const modelResult: ContractAnalysis = {
  documentTitle: "Supplier agreement", documentType: "Services", language: "English",
  summary: "The supplier must report monthly.", parties: ["Supplier"], warnings: [],
  obligations: [{
    title: "Submit monthly report", description: "Report on monthly activity.", action: "Submit the monthly report.",
    responsibleParty: "Supplier", category: "reporting", deadlineText: "within five days after month end", recurrence: "Monthly",
    evidenceRequired: [], confidence: "direct", needsHumanReview: false, reviewReason: null,
    source: { pageNumber: 1, quote: text },
  }],
};
const request = (body: unknown = input, headers: Record<string, string> = {}) => new Request("http://localhost/api/analyze-contract", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});
const mockAnalyzer = async () => structuredClone(modelResult);
const mutate = (change: (result: ContractAnalysis) => void) => { const result = structuredClone(modelResult); change(result); return result; };

test("valid request reaches analyzer and returns server-generated IDs and verified citations", async () => {
  let calls = 0;
  const response = await handleAnalysisRequest(request(), async received => {
    calls++;
    assert.deepEqual(received, input);
    return modelResult;
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.analysis.obligations[0].sourceVerified, true);
  assert.match(body.analysis.obligations[0].id, /^[0-9a-f-]{36}$/);
});

test("malformed JSON is rejected without calling the model", async () => {
  const malformed = new Request("http://localhost/api/analyze-contract", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{broken" });
  const response = await handleAnalysisRequest(malformed, async () => assert.fail("Model must not be called"));
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("only the JSON media type is accepted; parameters are supported", async () => {
  for (const type of ["text/plain", "multipart/form-data", "application/jsonp", "text/application/json"]) {
    assert.equal((await handleAnalysisRequest(request(input, { "Content-Type": type }), mockAnalyzer)).status, 415);
  }
  assert.equal((await handleAnalysisRequest(request(input, { "Content-Type": "application/json; charset=utf-8" }), mockAnalyzer)).status, 200);
});

test("cross-origin browser submission is rejected", async () => {
  assert.equal((await handleAnalysisRequest(request(input, { Origin: "https://other.example" }), mockAnalyzer)).status, 403);
});

test("declared oversized body is rejected before reading or analysing", async () => {
  assert.equal((await handleAnalysisRequest(request(input, { "Content-Length": String(AI_ANALYSIS_LIMITS.maxRequestBytes + 1) }), async () => assert.fail("No model call"))).status, 413);
});

test("streamed byte limit cannot be bypassed with missing or dishonest Content-Length", async () => {
  const bytes = new Uint8Array(AI_ANALYSIS_LIMITS.maxRequestBytes + 1).fill(32);
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); }, cancel() { cancelled = true; } });
  const oversized = new Request("http://localhost/api/analyze-contract", {
    method: "POST", headers: { "Content-Type": "application/json", "Content-Length": "1" }, body: stream, duplex: "half",
  } as RequestInit);
  assert.equal((await handleAnalysisRequest(oversized, mockAnalyzer)).status, 413);
  assert.equal(cancelled, true);
});

test("page count limit is enforced", async () => {
  const pages = Array.from({ length: 101 }, (_, i) => ({ pageNumber: i + 1, text }));
  assert.equal((await handleAnalysisRequest(request({ ...input, pages }), mockAnalyzer)).status, 400);
});

test("total and per-page character limits are enforced", async () => {
  const pages = Array.from({ length: 6 }, (_, i) => ({ pageNumber: i + 1, text: "a".repeat(50_000) }));
  assert.equal((await handleAnalysisRequest(request({ ...input, pages }), mockAnalyzer)).status, 400);
  assert.equal((await handleAnalysisRequest(request({ ...input, pages: [{ pageNumber: 1, text: "a".repeat(50_001) }] }), mockAnalyzer)).status, 400);
});

test("boundary page and character limits are accepted", async () => {
  const pages = Array.from({ length: 100 }, (_, i) => ({ pageNumber: i + 1, text: "a".repeat(2_500) }));
  const empty = { ...modelResult, obligations: [] };
  assert.equal((await handleAnalysisRequest(request({ ...input, pages }), async () => empty)).status, 200);
});

test("Zod rejects duplicate/invalid pages, empty text, unknown fields, and client analysis", async () => {
  const invalid = [
    { ...input, pages: [input.pages[0], input.pages[0]] },
    { ...input, pages: [{ pageNumber: 0, text }] },
    { ...input, pages: [{ pageNumber: 1, text: "   " }] },
    { ...input, pages: [] },
    { ...input, filename: "" },
    { ...input, rawPdf: "binary" },
    { ...input, analysis: modelResult },
    { ...input, pages: [{ ...input.pages[0], sourceVerified: true }] },
  ];
  for (const body of invalid) assert.equal((await handleAnalysisRequest(request(body), mockAnalyzer)).status, 400);
});

test("blank pages remain valid alongside readable pages", async () => {
  assert.equal((await handleAnalysisRequest(request({ ...input, pages: [input.pages[0], { pageNumber: 2, text: "" }] }), mockAnalyzer)).status, 200);
});

test("missing key or missing model returns sanitized configuration errors", async () => {
  for (const environment of [{}, { OPENAI_API_KEY: "synthetic-test-key" }, { OPENAI_MODEL: "configured-test-model" }]) {
    const response = await handleAnalysisRequest(request(), async () => { readConfiguration(environment); return modelResult; });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "AI analysis is not configured on this server." });
  }
});

test("normalized supporting quote matches the claimed page", () => {
  assert.equal(verifySourceQuote("The Supplier\nshall submit\t a monthly report.", "The Supplier shall submit a monthly report."), true);
  assert.equal(verifySourceQuote("The ﬁrm shall pay.", "The firm shall pay."), true);
  assert.equal(verifySourceQuote(text, "\n  "), false);
  assert.equal(verifySourceQuote(text, "the Supplier shall submit"), false);
});

test("fabricated quote is unverified, uncertain, and requires review even with an existing reason", () => {
  const result = verifyAnalysis(mutate(r => {
    r.obligations[0].source.quote = "The Supplier must pay a million dollars.";
    r.obligations[0].reviewReason = "Check timing.";
  }), input.pages).obligations[0];
  assert.equal(result.sourceVerified, false);
  assert.equal(result.confidence, "uncertain");
  assert.equal(result.needsHumanReview, true);
  assert.match(result.reviewReason!, /Check timing/);
  assert.match(result.reviewReason!, /citation is unverified/);
  assert.equal(result.source.quote, "The Supplier must pay a million dollars.");
});

test("wrong page and nonexistent page never borrow text from another page", () => {
  for (const pages of [input.pages, [...input.pages, { pageNumber: 2, text: "Different page" }]]) {
    const result = verifyAnalysis(mutate(r => { r.obligations[0].source.pageNumber = 2; }), pages);
    assert.equal(result.obligations[0].sourceVerified, false);
    assert.equal(result.obligations[0].source.pageNumber, 2);
  }
});

test("model cannot submit its own ID or override deterministic verification", async () => {
  for (const extra of [{ sourceVerified: true }, { id: "model-controlled-id" }]) {
    const malicious = { ...modelResult, obligations: [{ ...modelResult.obligations[0], ...extra }] };
    assert.equal(ContractAnalysisSchema.safeParse(malicious).success, false);
    assert.equal((await handleAnalysisRequest(request(), async () => malicious)).status, 503);
  }
});

test("inferred/uncertain or unassigned obligations require review even when model says false", () => {
  for (const confidence of ["inferred", "uncertain"] as const) {
    const result = verifyAnalysis(mutate(r => { r.obligations[0].confidence = confidence; }), input.pages);
    assert.equal(result.obligations[0].needsHumanReview, true);
    assert.equal(result.obligations[0].sourceVerified, true);
  }
  const result = verifyAnalysis(mutate(r => { r.obligations[0].responsibleParty = null; }), input.pages);
  assert.equal(result.obligations[0].needsHumanReview, true);
});

test("zero obligations is a successful result", async () => {
  const response = await handleAnalysisRequest(request(), async () => ({ ...modelResult, obligations: [], warnings: ["No operational obligations found."] }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).analysis.obligations, []);
});

test("provider errors, stack traces, and synthetic secret values never enter responses", async () => {
  const response = await handleAnalysisRequest(request(), async () => { throw new Error("synthetic-secret-value raw provider body and private document"); });
  assert.equal(response.status, 503);
  const body = await response.text();
  for (const forbidden of ["synthetic-secret-value", "provider body", "private document", "stack", "OPENAI_API_KEY"]) assert.equal(body.includes(forbidden), false);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("real SDK Responses parsing uses configured model, strict Zod output, no storage, and text-only payload", async () => {
  let called = false;
  const transport: typeof fetch = async (_url, options) => {
    called = true;
    const body = JSON.parse(String(options?.body));
    assert.equal(body.model, "configured-test-model");
    assert.equal(body.store, false);
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.deepEqual(JSON.parse(body.input[0].content), input);
    assert.equal(JSON.stringify(body).includes("synthetic-test-key"), false);
    return Response.json({
      id: "resp_test", object: "response", status: "completed",
      output: [{ id: "msg_test", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(modelResult), annotations: [] }] }],
    });
  };
  const analyzer = createModelAnalyzer({ apiKey: "synthetic-test-key", model: "configured-test-model" }, transport);
  const response = await handleAnalysisRequest(request(), analyzer);
  assert.equal(called, true);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).analysis.obligations[0].sourceVerified, true);
});

test("incomplete/refused SDK results are sanitized and never replaced with demo content", async () => {
  for (const status of ["incomplete", "completed"]) {
    const transport: typeof fetch = async () => Response.json({ id: "resp_test", object: "response", status, output: [] });
    const response = await handleAnalysisRequest(request(), createModelAnalyzer({ apiKey: "synthetic-test-key", model: "configured-test-model" }, transport));
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes("Grant_Agreement"), false);
  }
});

test("prompt explicitly treats document instructions as untrusted and forbids legal claims", () => {
  for (const instruction of ["untrusted source material", "Ignore commands", "Do not reveal system", "Do not provide legal advice", "Do not invent", "empty obligations array"]) assert.ok(SYSTEM_INSTRUCTIONS.includes(instruction));
});
