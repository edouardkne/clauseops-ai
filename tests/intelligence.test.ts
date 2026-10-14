import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";
import type { AnalyzeContractRequest, VerifiedContractAnalysis, VerifiedObligation } from "../lib/ai/contract-analysis-schema";
import { deriveIntelligence, normalizeDeadline } from "../lib/intelligence/engine";
import { buildObligationGraph } from "../lib/intelligence/graph";
import { AnalysisCache, documentContentFingerprint, documentFingerprint, hasSameDocumentContent } from "../lib/intelligence/analysis-cache";
import { addIndependentEvidence, resolveContractReplacement } from "../lib/intelligence/session-state";
import { answerQuery, LOCAL_QUESTIONS, routeQuery } from "../lib/intelligence/queries";
import type { AnalysisSession, OperationalState } from "../lib/intelligence/types";
import type { SessionEvidence } from "../lib/evidence/types";
import { createEvidence } from "../lib/evidence/logic";
import type { ExtractedDocument } from "../lib/pdf/types";

const today = "2026-10-01";
const state: OperationalState = { completed: {}, evidenceLinks: [] };
function obligation(overrides: Partial<VerifiedObligation> = {}): VerifiedObligation {
  return {
    id: "obligation-a", title: "Pay invoice", description: "Pay the supplier invoice.", action: "Pay the invoice.",
    responsibleParty: "Customer", category: "payment", deadlineText: "2026-10-20", recurrence: null,
    evidenceRequired: [], confidence: "direct", needsHumanReview: false, reviewReason: null,
    source: { pageNumber: 1, quote: "The Customer shall pay the invoice." }, sourceVerified: true, ...overrides,
  };
}
function analysis(obligations: VerifiedObligation[] = [obligation()]): VerifiedContractAnalysis {
  return { documentTitle: "Synthetic agreement", documentType: "Service agreement", language: "English", summary: "Test fixture only.", parties: ["Customer"], obligations, warnings: [] };
}
const mixed = analysis([
  obligation({ evidenceRequired: ["Invoice"] }),
  obligation({ id: "b", title: "Report progress", category: "reporting", confidence: "inferred", deadlineText: null }),
  obligation({ id: "c", title: "Provide insurance", category: "insurance", confidence: "uncertain", sourceVerified: false, responsibleParty: null, deadlineText: "promptly", evidenceRequired: ["Certificate"] }),
  obligation({ id: "d", title: "Review scope", category: "governance", responsibleParty: " ", deadlineText: null, reviewReason: "Confirm governing scope." }),
  obligation({ id: "e", title: "Deliver service", category: "service_delivery", deadlineText: "2026-10-03" }),
]);
const intelligence = deriveIntelligence(mixed, state, today);
function activeSessionWithDecisions(): AnalysisSession {
  const obligations = Array.from({ length: 14 }, (_, index) => obligation({ id: `obligation-${index + 1}` }));
  const evidence: SessionEvidence = {
    id: "evidence-1",
    fingerprint: "b".repeat(64),
    contentFingerprint: "c".repeat(64),
    filename: "accepted-evidence.pdf",
    fileType: "application/pdf",
    size: 10,
    addedAt: "2026-10-01T00:00:00.000Z",
    extractionStatus: "extracted",
    pages: [{ pageNumber: 1, text: "Supporting source.", characterCount: 18 }],
    proposals: [{
      obligationId: "obligation-14",
      match: "strong",
      explanation: "Synthetic reviewed association.",
      pageNumber: 1,
      supportingEvidenceQuote: "Supporting source.",
      quoteVerified: true,
      validityText: null,
      validityVerified: true,
      needsHumanReview: false,
      reviewReason: null,
      method: "local",
      decision: "accepted",
      reviewed: true,
    }],
  };
  return {
    key: "contract-key",
    contentFingerprint: "a".repeat(64),
    filename: "service-agreement.pdf",
    pageCount: 4,
    analysis: analysis(obligations),
    state: {
      completed: { "obligation-14": true },
      evidenceLinks: [{ evidenceId: evidence.id, obligationId: "obligation-14" }],
      evidence: [evidence],
    },
  };
}

test("intelligence summary derives all eleven counts including verified and unverified citations", () => {
  assert.deepEqual(intelligence.summary, { total: 5, direct: 3, inferred: 1, uncertain: 1, needsReview: 3, verified: 4, unverified: 1, withDeadlines: 3, requiringEvidence: 2, missingResponsibleParty: 2, withoutClearDeadline: 3 });
  assert.equal(intelligence.obligations[2].source.quote, mixed.obligations[2].source.quote);
});

test("empty analysis produces zero counts and an empty review queue", () => {
  const result = deriveIntelligence(analysis([]), state, today);
  assert.ok(Object.values(result.summary).every(count => count === 0));
  assert.deepEqual(result.reviewQueue, []);
});

test("graph represents only actual document/party/deadline/evidence/source relationships", () => {
  const graph = buildObligationGraph({ key: "synthetic-document", analysis: mixed });
  assert.equal(graph.edges.filter(e => e.relation === "contains").length, 5);
  assert.equal(graph.edges.filter(e => e.relation === "owned_by").length, 3);
  assert.equal(graph.edges.filter(e => e.relation === "has_deadline").length, 3);
  assert.equal(graph.edges.filter(e => e.relation === "requires_evidence").length, 2);
  assert.equal(graph.edges.filter(e => e.relation === "cites_quote").length, 5);
  assert.equal(graph.edges.filter(e => e.relation === "on_page").length, 5);
  assert.equal(graph.nodes.filter(n => n.kind === "party").length, 1);
  assert.equal(graph.nodes.filter(n => n.kind === "source_page").length, 1);
  const ids = new Set(graph.nodes.map(n => n.id));
  assert.ok(graph.edges.every(e => ids.has(e.from) && ids.has(e.to)));
  const nodesById = new Map(graph.nodes.map(n => [n.id, n]));
  assert.ok(graph.edges.every(e => !(nodesById.get(e.from)?.kind === "obligation" && nodesById.get(e.to)?.kind === "obligation")));
  assert.ok(graph.nodes.some(n => n.kind === "deadline" && n.label === "promptly"));
});

test("review queue covers each deterministic trigger and preserves original review reasons", () => {
  const variations: Partial<VerifiedObligation>[] = [
    { confidence: "inferred" }, { confidence: "uncertain" }, { sourceVerified: false }, { responsibleParty: null },
    { responsibleParty: " " }, { deadlineText: "within 30 days of receipt" }, { needsHumanReview: true }, { reviewReason: "Conflicting clauses." },
  ];
  for (const variation of variations) {
    const result = deriveIntelligence(analysis([obligation(variation)]), state, today);
    assert.equal(result.reviewQueue.length, 1);
    assert.ok(result.reviewQueue[0].reviewReasons.length > 0);
    assert.equal(result.obligations[0].operationalStatus, "Needs Review");
  }
  assert.ok(intelligence.reviewQueue.find(o => o.id === "d")!.reviewReasons.includes("Confirm governing scope."));
});

test("missing information remains missing rather than generating dates or owners", () => {
  const o = deriveIntelligence(analysis([obligation({ responsibleParty: null, deadlineText: null, recurrence: null })]), state, today).obligations[0];
  assert.equal(o.responsibleParty, null);
  assert.equal(o.deadline.date, null);
  assert.equal(o.deadline.kind, "missing");
  assert.equal(o.recurrence, null);
  assert.deepEqual(o.evidenceRequired, []);
});

test("cancelling a replacement preserves active analysis and all session decisions", () => {
  const active = activeSessionWithDecisions();
  const sessions = new Map([[active.key, active]]);
  assert.equal(resolveContractReplacement(sessions, active, false), active);
  assert.equal(sessions.get(active.key), active);
  assert.equal(sessions.get(active.key)?.analysis.obligations.length, 14);
  assert.deepEqual(sessions.get(active.key)?.state.evidenceLinks, [{ evidenceId: "evidence-1", obligationId: "obligation-14" }]);
  assert.deepEqual(sessions.get(active.key)?.state.completed, { "obligation-14": true });
  assert.equal(sessions.get(active.key)?.state.evidence?.[0].proposals[0].reviewed, true);
});

test("confirming replacement discards only the active contract's incompatible session", () => {
  const active = activeSessionWithDecisions();
  const other: AnalysisSession = { ...active, key: "other-contract", filename: "other.pdf" };
  const sessions = new Map([[active.key, active], [other.key, other]]);
  assert.equal(resolveContractReplacement(sessions, active, true), null);
  assert.equal(sessions.has(active.key), false);
  assert.equal(sessions.get(other.key), other);
  assert.equal(resolveContractReplacement(sessions, null, true), null);
});

test("same extracted contract content is recognized across filename changes", async () => {
  const pages = [{ pageNumber: 1, text: "Synthetic service contract.", characterCount: 27 }];
  const first = await documentContentFingerprint({ pages });
  const renamed = await documentContentFingerprint({ pages: [...pages] });
  const keyOne = await documentFingerprint({ filename: "original.pdf", pages });
  const keyRenamed = await documentFingerprint({ filename: "renamed-copy.pdf", pages });
  assert.equal(hasSameDocumentContent(first, renamed), true);
  assert.notEqual(keyOne, keyRenamed);
  const active: AnalysisSession = {
    key: keyOne,
    contentFingerprint: first,
    filename: "original.pdf",
    pageCount: 1,
    analysis: analysis([obligation()]),
    state: { completed: {}, evidenceLinks: [] },
  };
  const sessions = new Map([[active.key, active]]);
  assert.equal(resolveContractReplacement(sessions, active, !hasSameDocumentContent(first, renamed)), active);
  assert.equal(sessions.get(active.key), active);
  const document = {
    filename: "renamed-copy.pdf",
    size: 100,
    mimeType: "application/pdf",
    pageCount: 1,
    characterCount: 27,
    pages,
  };
  const selfEvidence = await createEvidence(document, active.analysis.obligations);
  assert.equal(addIndependentEvidence(active, selfEvidence), active);
});

test("adding independent evidence preserves the active 14-obligation contract", async () => {
  const obligations = Array.from({ length: 14 }, (_, index) => obligation({ id: `obligation-${index + 1}` }));
  const contractDocument: ExtractedDocument = {
    filename: "00_DEMO_SERVICE_AGREEMENT.pdf",
    size: 100,
    mimeType: "application/pdf",
    pageCount: 1,
    characterCount: 35,
    pages: [{ pageNumber: 1, text: "Synthetic service agreement terms.", characterCount: 35 }],
  };
  const evidenceDocument: ExtractedDocument = {
    filename: "E01_ONBOARDING_CHECKLIST.pdf",
    size: 90,
    mimeType: "application/pdf",
    pageCount: 1,
    characterCount: 36,
    pages: [{ pageNumber: 1, text: "Completed onboarding checklist.", characterCount: 31 }],
  };
  const active: AnalysisSession = {
    key: "service-contract",
    contentFingerprint: await documentContentFingerprint({ pages: contractDocument.pages }),
    filename: contractDocument.filename,
    pageCount: 1,
    analysis: analysis(obligations),
    state: { completed: {}, evidenceLinks: [] },
  };
  const evidence = await createEvidence(evidenceDocument, obligations);
  const updated = addIndependentEvidence(active, evidence);
  assert.equal(updated.key, active.key);
  assert.equal(updated.analysis.obligations.length, 14);
  assert.equal(updated.state.evidence?.length, 1);
  assert.equal(updated.state.evidenceLinks.length, 0);
});

test("deadline normalization accepts only valid standalone explicit dates", () => {
  assert.deepEqual(normalizeDeadline("2028-02-29", null), { kind: "date", date: "2028-02-29", reason: null });
  for (const value of ["2026-02-29", "2026-13-01", "01/02/2026", "promptly", "within 30 days", "by 2026-10-20 if requested", "30 septembre 2026", "2026-10-20T12:00:00Z", "By February 29, 2026", "By October 32, 2026"]) {
    const result = normalizeDeadline(value, null);
    assert.equal(result.kind, "unresolved");
    assert.equal(result.date, null);
    assert.ok(result.reason);
  }
  assert.equal(normalizeDeadline("2026-10-20", "Annually").kind, "recurring");
  assert.equal(normalizeDeadline(null, "Annually").kind, "recurring");
  assert.equal(normalizeDeadline(null, null).kind, "missing");
});

test("unambiguous written fixed dates normalize while recurring and event-dependent deadlines stay distinct", () => {
  const examples = [
    ["No later than October 1, 2026", "2026-10-01"],
    ["By September 28, 2026", "2026-09-28"],
    ["No later than October 3, 2026", "2026-10-03"],
  ] as const;
  for (const [wording, date] of examples) {
    assert.deepEqual(normalizeDeadline(wording, null), { kind: "date", date, reason: null });
  }

  const recurring = normalizeDeadline("Every Monday by 17:00 UTC, beginning October 5, 2026", null);
  assert.equal(recurring.kind, "recurring");
  assert.equal(recurring.date, null);
  assert.ok(recurring.reason);
  assert.equal(normalizeDeadline("October 5, 2026", "Every Monday").kind, "recurring");

  const eventDependent = normalizeDeadline("Within 30 days of receipt", null);
  assert.equal(eventDependent.kind, "event-dependent");
  assert.equal(eventDependent.date, null);
  assert.ok(eventDependent.reason);

  const conditional = normalizeDeadline("By October 1, 2026 if requested", null);
  assert.equal(conditional.kind, "unresolved");
  assert.equal(conditional.date, null);
  assert.ok(conditional.reason);
});

test("written fixed-date normalization is timezone-independent and uses UTC calendar days", () => {
  const modulePath = resolve(".qa/test-build/lib/intelligence/engine.js");
  const script = `const { normalizeDeadline } = require(${JSON.stringify(modulePath)}); process.stdout.write(JSON.stringify(normalizeDeadline("No later than October 1, 2026", null)));`;
  for (const timezone of ["Pacific/Honolulu", "Pacific/Kiritimati"]) {
    const result = spawnSync(process.execPath, ["-e", script], {
      encoding: "utf8",
      env: { ...process.env, TZ: timezone },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { kind: "date", date: "2026-10-01", reason: null });
  }
});

test("fixed written dates change the calendar-deadline counter without erasing recurring review", () => {
  const examples = analysis([
    obligation({ id: "fixed-1", deadlineText: "No later than October 1, 2026" }),
    obligation({ id: "fixed-2", deadlineText: "By September 28, 2026" }),
    obligation({ id: "fixed-3", deadlineText: "No later than October 3, 2026" }),
    obligation({ id: "recurring", deadlineText: "Every Monday by 17:00 UTC, beginning October 5, 2026" }),
    ...Array.from({ length: 10 }, (_, index) => obligation({
      id: `unspecified-${index + 1}`,
      deadlineText: null,
      recurrence: null,
    })),
  ]);
  const result = deriveIntelligence(examples, state, today);
  assert.equal(result.summary.total, 14);
  assert.equal(result.summary.withoutClearDeadline, 11);
  assert.equal(result.obligations.filter(o => o.deadline.kind === "date").length, 3);
  assert.equal(result.obligations[3].deadline.kind, "recurring");
  assert.equal(result.obligations[3].reviewRequired, true);
  assert.equal(result.obligations[3].operationalStatus, "Needs Review");
});

test("status boundaries are deterministic with an injected UTC date", () => {
  for (const [deadlineText, expected] of [["2026-09-30", "Overdue"], ["2026-10-01", "Due Soon"], ["2026-10-08", "Due Soon"], ["2026-10-09", "Pending"], [null, "Pending"]]) {
    assert.equal(deriveIntelligence(analysis([obligation({ deadlineText })]), state, today).obligations[0].operationalStatus, expected);
  }
});

test("completion is only derived from local user state, and can be undone", () => {
  const source = analysis([obligation({ deadlineText: "2026-09-01" })]);
  assert.equal(deriveIntelligence(source, state, today).obligations[0].operationalStatus, "Overdue");
  assert.equal(deriveIntelligence(source, { ...state, completed: { "obligation-a": true } }, today).obligations[0].operationalStatus, "Completed");
  assert.equal(deriveIntelligence(source, { ...state, completed: { "obligation-a": false } }, today).obligations[0].operationalStatus, "Overdue");
});

test("missing evidence depends on a required item and mapped session references", () => {
  const source = analysis([obligation({ evidenceRequired: ["Receipt"] })]);
  assert.equal(deriveIntelligence(source, state, today).obligations[0].operationalStatus, "Missing Evidence");
  assert.equal(deriveIntelligence(source, { completed: { "obligation-a": true }, evidenceLinks: [] }, today).obligations[0].operationalStatus, "Missing Evidence");
  assert.equal(deriveIntelligence(source, { ...state, evidenceLinks: [{ evidenceId: "e1", obligationId: "different" }] }, today).obligations[0].operationalStatus, "Missing Evidence");
  const mapped = { completed: { "obligation-a": true }, evidenceLinks: [{ evidenceId: "e1", obligationId: "obligation-a" }] };
  assert.equal(deriveIntelligence(source, mapped, today).obligations[0].operationalStatus, "Completed");
  assert.equal(deriveIntelligence(analysis(), state, today).obligations[0].operationalStatus, "Pending");
});

test("review overrides completion, due dates, and missing evidence", () => {
  const result = deriveIntelligence(analysis([obligation({ sourceVerified: false, deadlineText: "2026-09-01", evidenceRequired: ["Receipt"] })]), { completed: { "obligation-a": true }, evidenceLinks: [] }, today);
  assert.equal(result.obligations[0].operationalStatus, "Needs Review");
  assert.equal(result.obligations[0].completionRecorded, true);
});

test("local assistant routes every supported question without provider access", async () => {
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  globalThis.fetch = async () => { providerCalls++; throw new Error("Network forbidden in local answers"); };
  try {
    for (const question of LOCAL_QUESTIONS) {
      assert.equal(routeQuery(question).kind, "local");
      assert.equal(answerQuery(question, intelligence).kind, "local");
    }
    assert.match(answerQuery(LOCAL_QUESTIONS[0], intelligence).text, /^5 obligations/);
    assert.equal(providerCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("category, evidence, review, confidence, and citation queries use structured fields", () => {
  assert.deepEqual(answerQuery("Which obligations concern payments?", intelligence).obligationIds, ["obligation-a"]);
  assert.deepEqual(answerQuery("Which obligations require evidence?", intelligence).obligationIds, ["obligation-a", "c"]);
  assert.deepEqual(answerQuery("Which obligations need human review?", intelligence).obligationIds, ["b", "c", "d"]);
  assert.deepEqual(answerQuery("Which citations are unverified?", intelligence).obligationIds, ["c"]);
  assert.equal(answerQuery("Which obligations have verified sources?", intelligence).obligationIds.length, 4);
  assert.deepEqual(answerQuery("Which obligations are inferred?", intelligence).obligationIds, ["b"]);
  assert.deepEqual(answerQuery("Which obligations are uncertain?", intelligence).obligationIds, ["c"]);
  assert.deepEqual(answerQuery("Which obligations have no responsible party?", intelligence).obligationIds, ["c", "d"]);
  assert.deepEqual(answerQuery("Which deadlines were found?", intelligence).obligationIds, ["obligation-a", "c", "e"]);
  assert.match(answerQuery("Who is responsible for each obligation?", intelligence).text, /Not specified/);
});

test("source lookup supports displayed number, ID, and exact title; missing references stay missing", () => {
  for (const reference of ["1", "#1", "obligation-a", "Pay invoice"]) {
    const answer = answerQuery(`Show the source for obligation ${reference}.`, intelligence);
    assert.deepEqual(answer.obligationIds, ["obligation-a"]);
    assert.match(answer.text, /Source page 1/);
    assert.ok(answer.text.includes(mixed.obligations[0].source.quote));
  }
  assert.match(answerQuery("Show the source for obligation 3.", intelligence).text, /Unverified source/);
  assert.match(answerQuery("Show the source for obligation 99.", intelligence).text, /not found/);
});

test("unrecognized synthesis questions never call a fallback provider or invent answers", () => {
  for (const question of ["Am I legally compliant?", "How should we renegotiate payments?", "Explain the business impact."]) {
    assert.equal(routeQuery(question).kind, "synthesis");
    const answer = answerQuery(question, intelligence);
    assert.match(answer.text, /no provider was contacted/);
    assert.deepEqual(answer.obligationIds, []);
  }
});

const payload: AnalyzeContractRequest = { filename: "Synthetic.pdf", pages: [{ pageNumber: 1, text: "Test source" }, { pageNumber: 2, text: "Second page" }] };
test("document fingerprint preserves exact text, filename, and page numbering", async () => {
  const key = await documentFingerprint(payload);
  assert.equal(key.length, 64);
  assert.equal(key, await documentFingerprint({ ...payload, pages: [...payload.pages].reverse() }));
  for (const input of [
    { ...payload, filename: "Other.pdf" },
    { ...payload, pages: [{ pageNumber: 1, text: "Test source " }, payload.pages[1]] },
    { ...payload, pages: [{ pageNumber: 3, text: "Test source" }, payload.pages[1]] },
  ]) assert.notEqual(key, await documentFingerprint(input));
});

test("session cache coalesces pending requests and reuses fulfilled unchanged-document analysis", async () => {
  const cache = new AnalysisCache();
  let calls = 0;
  const provider = async () => { calls++; return mixed; };
  const key = await documentFingerprint(payload);
  const [a, b] = await Promise.all([cache.run(key, provider), cache.run(key, provider)]);
  assert.equal(a, b);
  assert.equal(await cache.run(key, provider), a);
  assert.equal(calls, 1);
  await cache.run("changed-document", provider);
  assert.equal(calls, 2);
});

test("failed analysis is retryable and replacement can discard only the active cached analysis", async () => {
  const cache = new AnalysisCache();
  let calls = 0;
  await assert.rejects(cache.run("doc", async () => { calls++; throw new Error("Mock failure"); }));
  await cache.run("doc", async () => { calls++; return mixed; });
  assert.equal(calls, 2);
  await cache.run("other", async () => { calls++; return mixed; });
  assert.equal(calls, 3);
  cache.delete("doc");
  await cache.run("doc", async () => { calls++; return mixed; });
  await cache.run("other", async () => { calls++; return mixed; });
  assert.equal(calls, 4);
  cache.clear();
  await cache.run("doc", async () => { calls++; return mixed; });
  assert.equal(calls, 5);
  await new AnalysisCache().run("doc", async () => { calls++; return mixed; });
  assert.equal(calls, 6);
});
