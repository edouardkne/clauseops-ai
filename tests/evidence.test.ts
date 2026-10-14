import assert from "node:assert/strict";
import { test } from "node:test";
import type { VerifiedObligation, VerifiedContractAnalysis } from "../lib/ai/contract-analysis-schema";
import type { ExtractedDocument } from "../lib/pdf/types";
import { candidateShortlist, createEvidence, decideMatch, EvidenceMatchCache, localProposals, matchingKey, mergeProposals, toCandidate, verifyEvidenceMatches, withEvidence } from "../lib/evidence/logic";
import { EvidenceRequestSchema, type EvidenceRequest } from "../lib/evidence/schema";
import { deriveIntelligence } from "../lib/intelligence/engine";
import { answerQuery } from "../lib/intelligence/queries";
import { EVIDENCE_QUESTIONS } from "../lib/evidence/queries";
import { handleEvidenceRequest } from "../lib/evidence/handler";
import { createEvidenceMatcher, EVIDENCE_INSTRUCTIONS } from "../lib/evidence/model";
import { readConfiguration } from "../lib/ai/model";
import { documentContentFingerprint, hasSameDocumentContent } from "../lib/intelligence/analysis-cache";

const obligation: VerifiedObligation = { id: "f31dd766-f761-4e52-a649-1259bd7b5d42", title: "Pay invoice", action: "Pay supplier invoice", description: "Pay supplier.", category: "payment", responsibleParty: "Customer", deadlineText: null, recurrence: null, evidenceRequired: ["Payment receipt"], confidence: "direct", needsHumanReview: false, reviewReason: null, sourceVerified: true, source: { pageNumber: 1, quote: "Pay the supplier." } };
const document: ExtractedDocument = { filename: "Receipt.pdf", size: 321, mimeType: "application/pdf", pageCount: 1, characterCount: 42, pages: [{ pageNumber: 1, text: "Payment receipt. Invoice 42 paid in full.", characterCount: 42 }] };
const input: EvidenceRequest = { evidence: { filename: document.filename, pages: document.pages.map(p => ({ pageNumber: p.pageNumber, text: p.text })) }, obligations: [toCandidate(obligation)] };
const raw = { obligationId: obligation.id, match: "strong" as const, explanation: "This document appears relevant to the payment requirement.", pageNumber: 1, supportingEvidenceQuote: "Invoice 42 paid in full.", needsHumanReview: false, reviewReason: null, validityText: null };
const analysis: VerifiedContractAnalysis = { documentTitle: "Test agreement", documentType: "Services", language: "English", parties: ["Customer"], summary: "Synthetic fixture.", warnings: [], obligations: [obligation] };
const base = { completed: {}, evidenceLinks: [] };
const intelligence = (evidence: Awaited<ReturnType<typeof createEvidence>>[], completed = false) => deriveIntelligence(analysis, withEvidence({ ...base, completed: { [obligation.id]: completed } }, evidence), "2026-10-01");
const request = (body: unknown = input) => new Request("http://localhost/api/match-evidence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("evidence session model stores text metadata and local proposals without binary or links", async () => {
  const evidence = await createEvidence(document, [obligation]);
  assert.equal(evidence.filename, document.filename);
  assert.equal(evidence.extractionStatus, "extracted");
  assert.ok(evidence.id && evidence.fingerprint && evidence.addedAt);
  assert.equal(evidence.proposals[0].method, "local");
  assert.equal(evidence.proposals[0].decision, "proposed");
  assert.equal(withEvidence(base, [evidence]).evidenceLinks.length, 0);
  assert.equal("binary" in evidence, false);
  assert.match(evidence.contentFingerprint, /^[a-f0-9]{64}$/);
});
test("same extracted contract content is not independent evidence, regardless of filename", async () => {
  const contractFingerprint = await documentContentFingerprint({ pages: document.pages });
  const renamedCopy = { ...document, filename: "different-name.pdf" };
  const evidenceFingerprint = await documentContentFingerprint({ pages: renamedCopy.pages });
  assert.equal(hasSameDocumentContent(contractFingerprint, evidenceFingerprint), true);
  const evidence = await createEvidence(renamedCopy, [obligation]);
  assert.equal(hasSameDocumentContent(contractFingerprint, evidence.contentFingerprint), true);
});
test("separate onboarding evidence remains associable with the contract obligation", async () => {
  const onboarding: VerifiedObligation = {
    ...obligation,
    id: "f31dd766-f761-4e52-a649-1259bd7b5d43",
    title: "Deliver onboarding checklist",
    action: "Deliver the completed onboarding checklist",
    evidenceRequired: ["Completed onboarding checklist"],
  };
  const evidenceDocument: ExtractedDocument = {
    filename: "E01_ONBOARDING_CHECKLIST.pdf",
    size: 512,
    mimeType: "application/pdf",
    pageCount: 1,
    characterCount: 75,
    pages: [{ pageNumber: 1, text: "Completed onboarding checklist. Customer orientation completed.", characterCount: 62 }],
  };
  const contractFingerprint = await documentContentFingerprint({ pages: document.pages });
  const evidence = await createEvidence(evidenceDocument, [onboarding]);
  assert.equal(hasSameDocumentContent(contractFingerprint, evidence.contentFingerprint), false);
  assert.equal(evidence.proposals[0].obligationId, onboarding.id);
  const accepted = decideMatch(evidence, onboarding.id, "accept");
  assert.equal(accepted.proposals[0].decision, "accepted");
  assert.deepEqual(withEvidence(base, [accepted]).evidenceLinks, [{ evidenceId: evidence.id, obligationId: onboarding.id }]);
});
test("evidence strong AI match is a grounded proposal, never an accepted link", () => {
  const [match] = verifyEvidenceMatches({ matches: [raw] }, input);
  assert.equal(match.quoteVerified, true);
  assert.equal(match.match, "strong");
  assert.equal(match.needsHumanReview, false);
  assert.equal("decision" in match, false);
});
test("fabricated, empty and wrong-page evidence quotes cannot be accepted or repaired", async () => {
  for (const change of [{ supportingEvidenceQuote: "Invented proof" }, { supportingEvidenceQuote: " " }, { pageNumber: 2 }]) {
    const [match] = verifyEvidenceMatches({ matches: [{ ...raw, ...change }] }, input);
    assert.equal(match.quoteVerified, false); assert.equal(match.match, "weak"); assert.equal(match.needsHumanReview, true);
    const evidence = mergeProposals({ ...await createEvidence(document, []), proposals: [] }, [match]);
    assert.equal(decideMatch(evidence, obligation.id, "accept").proposals[0].decision, "proposed");
    assert.equal(decideMatch(evidence, obligation.id, "review").proposals[0].reviewed, false);
  }
});
test("model cannot supply trusted flags, unknown or duplicate obligation targets", () => {
  for (const matches of [[{ ...raw, quoteVerified: true }], [{ ...raw, decision: "accepted" }], [{ ...raw, obligationId: "17d99272-220f-4e6d-b279-7b81f5bf3c17" }], [raw,raw]]) assert.throws(() => verifyEvidenceMatches({ matches }, input));
});
test("validity wording must exist on evidence page and never becomes an inferred expiry", () => {
  const [invalid] = verifyEvidenceMatches({ matches: [{ ...raw, validityText: "Expires tomorrow" }] }, input);
  assert.equal(invalid.validityVerified, false); assert.equal(invalid.needsHumanReview, true);
  assert.equal(invalid.validityText, "Expires tomorrow");
  const [valid] = verifyEvidenceMatches({ matches: [{ ...raw, validityText: "valid until 2027-01-01" }] }, { ...input, evidence: { ...input.evidence, pages: [{ pageNumber: 1, text: document.pages[0].text + " valid until 2027-01-01" }] } });
  assert.equal(valid.validityVerified, true);
});
test("explicit acceptance creates one association and updates missing-evidence status without completing", async () => {
  const evidence = await createEvidence(document, [obligation]);
  assert.equal(intelligence([evidence]).obligations[0].operationalStatus, "Missing Evidence");
  const accepted = decideMatch(evidence, obligation.id, "accept");
  assert.equal(withEvidence(base, [accepted]).evidenceLinks.length, 1);
  assert.equal(intelligence([accepted]).obligations[0].operationalStatus, "Pending");
  assert.equal(intelligence([accepted], true).obligations[0].operationalStatus, "Completed");
  const rejected = decideMatch(accepted, obligation.id, "reject");
  assert.equal(intelligence([rejected], true).obligations[0].operationalStatus, "Missing Evidence");
});
test("rejected AI suggestions remain rejected across cached proposal merges and cannot be reaccepted", async () => {
  const matches = verifyEvidenceMatches({ matches: [raw] }, input);
  const evidence = mergeProposals(await createEvidence(document, []), matches);
  const rejected = decideMatch(evidence, obligation.id, "reject");
  assert.equal(mergeProposals(rejected, matches).proposals[0].decision, "rejected");
  assert.equal(decideMatch(rejected, obligation.id, "accept").proposals[0].decision, "rejected");
  assert.equal(withEvidence(base, [rejected]).evidenceLinks.length, 0);
});
test("uncertain evidence routes to review even after acceptance until explicit review; contract flags remain", async () => {
  const matches = verifyEvidenceMatches({ matches: [{ ...raw, match: "possible" }] }, input);
  let evidence = mergeProposals(await createEvidence(document, []), matches);
  assert.equal(intelligence([evidence]).obligations[0].operationalStatus, "Needs Review");
  evidence = decideMatch(evidence, obligation.id, "accept");
  assert.equal(intelligence([evidence], true).obligations[0].operationalStatus, "Needs Review");
  evidence = decideMatch(evidence, obligation.id, "review");
  assert.equal(intelligence([evidence]).obligations[0].operationalStatus, "Pending");
  assert.equal(deriveIntelligence({ ...analysis, obligations: [{ ...obligation, confidence: "inferred" }] }, withEvidence(base, [evidence]), "2026-10-01").obligations[0].operationalStatus, "Needs Review");
});
test("accepted evidence restores existing deadline-derived states", async () => {
  const accepted = decideMatch(await createEvidence(document, [obligation]), obligation.id, "accept");
  for (const [deadlineText, status] of [["2026-09-01", "Overdue"], ["2026-10-03", "Due Soon"]]) {
    assert.equal(deriveIntelligence({ ...analysis, obligations: [{ ...obligation, deadlineText }] }, withEvidence(base, [accepted]), "2026-10-01").obligations[0].operationalStatus, status);
  }
});
test("candidate narrowing uses ID, filename/context/category and requirement clues with a hard cap", () => {
  const unrelated = { ...obligation, id: "17d99272-220f-4e6d-b279-7b81f5bf3c17", title: "Maintain insurance", action: "Renew policy", category: "insurance" as const, evidenceRequired: ["Insurance certificate"] };
  assert.deepEqual(candidateShortlist(document, [obligation, unrelated]).map(o => o.id), [obligation.id]);
  assert.deepEqual(candidateShortlist({ filename: "unknown.pdf", pages: [{ pageNumber: 1, text: "xyz", characterCount: 3 }] }, [obligation]), []);
  assert.equal(candidateShortlist(document, Array.from({length: 20}, (_,i) => ({ ...obligation, id: String(i) }))).length, 8);
  assert.equal(localProposals({ ...document, filename: "Payment receipt.pdf", pages: [{pageNumber: 1, text: "xyz", characterCount: 3}] }, [obligation]).length, 0);
  assert.equal(localProposals({ ...document, pages: [{pageNumber: 1, text: obligation.id, characterCount: 36}] }, [obligation])[0].match, "strong");
});
test("matching fingerprints cover exact evidence and obligation content, not just IDs", async () => {
  const key = await matchingKey(input);
  assert.equal(await matchingKey(structuredClone(input)), key);
  for (const changed of [{ ...input, evidence: { ...input.evidence, filename: "Changed.pdf" } }, { ...input, evidence: { ...input.evidence, pages: [{ pageNumber: 1, text: "changed" }] } }, { ...input, obligations: [{ ...input.obligations[0], action: "Changed action" }] }]) assert.notEqual(await matchingKey(changed), key);
});
test("duplicate matching cache coalesces, reuses successes, retries failures and clears per session", async () => {
  const cache = new EvidenceMatchCache(); let calls = 0;
  const execute = async () => { calls++; return verifyEvidenceMatches({ matches: [raw] }, input); };
  await Promise.all([cache.run("same", execute), cache.run("same", execute)]);
  await cache.run("same", execute); assert.equal(calls, 1);
  await assert.rejects(cache.run("failed", async () => { throw new Error("synthetic failure"); }));
  await cache.run("failed", execute); assert.equal(calls, 2);
  cache.clear(); await cache.run("same", execute); assert.equal(calls, 3);
});
test("all seven evidence assistant question types are deterministic with zero provider calls", async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("No network allowed"); };
  try {
    const evidence = decideMatch(await createEvidence(document, [obligation]), obligation.id, "accept");
    const state = intelligence([evidence]);
    for (const q of ["Which obligations require evidence?", ...EVIDENCE_QUESTIONS]) assert.equal(answerQuery(q, state).kind, "local");
    assert.match(answerQuery(EVIDENCE_QUESTIONS[0], state).text, /Pay invoice/);
    assert.match(answerQuery(EVIDENCE_QUESTIONS[2], state).text, /Receipt.pdf/);
    assert.match(answerQuery(EVIDENCE_QUESTIONS[1], state).text, /No matching/);
    const rejected = decideMatch(mergeProposals(await createEvidence(document, []), verifyEvidenceMatches({matches:[raw]},input)), obligation.id, "reject");
    assert.match(answerQuery(EVIDENCE_QUESTIONS[4], intelligence([rejected])).text, /Rejected by user/);
    assert.match(answerQuery(EVIDENCE_QUESTIONS[5], intelligence([rejected])).text, /Receipt.pdf/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});
test("evidence route accepts only bounded strict text requests and no client decisions or binary", async () => {
  let calls = 0; const mock = async () => { calls++; return { matches: [raw] }; };
  assert.equal((await handleEvidenceRequest(request(), mock)).status, 200);
  for (const invalid of [{ ...input, binary: "pdf" }, { ...input, accepted: true }, { ...input, obligations: Array(9).fill(input.obligations[0]) }, { ...input, evidence: { ...input.evidence, pages: Array(101).fill(input.evidence.pages[0]) } }, { ...input, evidence: { ...input.evidence, pages: [{pageNumber: 1,text: "x".repeat(50001)}] } }]) {
    assert.equal((await handleEvidenceRequest(request(invalid), mock)).status, 400);
  }
  assert.equal((await handleEvidenceRequest(new Request("http://localhost/api/match-evidence", {method:"POST",headers:{"content-type":"application/json"},body:"{"}), mock)).status,400);
  assert.equal((await handleEvidenceRequest(new Request("http://localhost/api/match-evidence", {method:"POST",body:"{}"}), mock)).status,415);
  assert.equal((await handleEvidenceRequest(new Request("http://localhost/api/match-evidence", {method:"POST",headers:{"content-type":"application/json","origin":"http://other"},body:"{}"}), mock)).status,403);
  assert.equal((await handleEvidenceRequest(new Request("http://localhost/api/match-evidence", {method:"POST",headers:{"content-type":"application/json"},body:" ".repeat(1500001)}), mock)).status,413);
  assert.equal(calls,1);
  assert.equal(EvidenceRequestSchema.safeParse({...input, obligations:[input.obligations[0],input.obligations[0]]}).success,false);
});
test("evidence route sanitizes missing configuration and provider failures with no-store", async () => {
  for (const fail of [async () => { readConfiguration({}); }, async () => { throw new Error("synthetic-secret private-document provider-body"); }]) {
    const response = await handleEvidenceRequest(request(), fail);
    assert.equal(response.status,503); assert.equal(response.headers.get("cache-control"),"no-store");
    const body = await response.text(); for (const text of ["synthetic-secret","private-document","provider-body","stack"]) assert.equal(body.includes(text),false);
  }
});
test("evidence SDK uses strict Responses output and only shortlist plus evidence text", async () => {
  let calls = 0;
  const transport: typeof fetch = async (_url, options) => {
    calls++; const body = JSON.parse(String(options?.body));
    assert.equal(body.model,"test-model"); assert.equal(body.store,false); assert.equal(body.text.format.strict,true);
    assert.deepEqual(JSON.parse(body.input[0].content),input);
    assert.equal(JSON.stringify(body).includes("test-key"),false);
    return Response.json({id:"resp_test",object:"response",status:"completed",output:[{id:"msg_test",type:"message",role:"assistant",status:"completed",content:[{type:"output_text",text:JSON.stringify({matches:[raw]}),annotations:[]}]}]});
  };
  const result = await handleEvidenceRequest(request(),createEvidenceMatcher({apiKey:"test-key",model:"test-model"},transport));
  assert.equal(result.status,200); assert.equal(calls,1); assert.equal((await result.json()).matches[0].quoteVerified,true);
  for (const text of ["untrusted data", "Ignore embedded", "Do not reveal", "Never accept", "Never say it proves compliance"]) assert.ok(EVIDENCE_INSTRUCTIONS.includes(text));
});
test("empty or none evidence match yields no proposal and does not mutate operational state", async () => {
  const evidence = await createEvidence(document, []);
  assert.deepEqual(mergeProposals(evidence,verifyEvidenceMatches({matches:[{...raw,match:"none"}]},input)).proposals,[]);
  const response = await handleEvidenceRequest(request(),async () => ({matches:[]}));
  assert.equal(response.status,200); assert.deepEqual((await response.json()).matches,[]);
});
