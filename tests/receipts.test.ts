import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { canonicalize, ReceiptSchema, sealReceipt, verifyReceipt } from "../lib/receipts/core";
import { createReceipt, sha256 } from "../lib/receipts/snapshot";
import type { AnalysisSession } from "../lib/intelligence/types";

const time = "2026-10-10T10:00:00.000Z";
const date = "2026-10-10";
const nodeDigest = (text: string) => createHash("sha256").update(text).digest("hex");
function session(): AnalysisSession {
  return { key: "a".repeat(64), contentFingerprint: "d".repeat(64), filename: "PRIVATE-CONTRACT.pdf", pageCount: 1,
    analysis: { documentTitle: "PRIVATE-TITLE", documentType: "Agreement", language: "English", summary: "PRIVATE-SUMMARY", parties: ["PRIVATE-PERSON"], warnings: [],
      obligations: [{ id: "private-obligation-id", title: "PRIVATE-TASK", description: "PRIVATE-DESCRIPTION", action: "Pay", responsibleParty: "PRIVATE-PERSON", category: "payment", deadlineText: "2026-10-30", recurrence: null, evidenceRequired: ["Receipt"], confidence: "direct", needsHumanReview: false, reviewReason: null, source: { pageNumber: 1, quote: "PRIVATE-CONTRACT-TEXT" }, sourceVerified: true }],
    }, state: { completed: {}, evidenceLinks: [], evidence: [{
      id: "private-evidence-id", fingerprint: "b".repeat(64), contentFingerprint: "c".repeat(64), filename: "PRIVATE-EVIDENCE.pdf", fileType: "application/pdf", size: 100, addedAt: time, extractionStatus: "extracted", pages: [{ pageNumber: 1, text: "PRIVATE-EVIDENCE-TEXT", characterCount: 21 }],
      proposals: [{ obligationId: "private-obligation-id", match: "strong", explanation: "PRIVATE-EXPLANATION", pageNumber: 1, supportingEvidenceQuote: "PRIVATE-EVIDENCE-TEXT", needsHumanReview: false, reviewReason: null, validityText: null, quoteVerified: true, validityVerified: true, method: "local", decision: "accepted", reviewed: false }],
    }] } };
}

test("receipt canonicalization ignores object insertion order and rejects non-JSON values", () => {
  assert.equal(canonicalize({ z: 1, a: { b: true, a: "Ã©" } }), canonicalize({ a: { a: "Ã©", b: true }, z: 1 }));
  for (const value of [undefined, NaN, Infinity, new Date(), { x: undefined }]) assert.throws(() => canonicalize(value));
});
test("receipt SHA-256 matches Node standard implementation including Unicode", async () => {
  for (const value of ["", "abc", "source Ã© ðŸ”’"]) assert.equal(await sha256(value), nodeDigest(value));
});
test("same snapshot and timestamp produce identical receipt and identifier", async () => {
  assert.deepEqual(await createReceipt(session(), date, time), await createReceipt(session(), date, time));
});
test("snapshot generation derives accepted links, counts and state without trusting stale links", async () => {
  const s = session(); s.state.evidenceLinks = [{ obligationId: "fake", evidenceId: "fake" }];
  const r = await createReceipt(s, date, time);
  assert.equal(r.acceptedEvidenceLinks.length, 1); assert.equal(r.operationalStateSummary.Pending, 1);
  assert.equal(r.unresolvedReviewCount, 0); assert.deepEqual(r.reviewedObligations, []);
  assert.equal((await verifyReceipt(r, nodeDigest)).valid, true);
});
test("meaningful completion, analysis, evidence decision and evaluation date changes alter receipt hash", async () => {
  const baseline = await createReceipt(session(), date, time);
  for (const mutate of [
    (s: AnalysisSession) => { s.state.completed["private-obligation-id"] = true; },
    (s: AnalysisSession) => { s.analysis.summary = "Different interpretation"; },
    (s: AnalysisSession) => { s.state.evidence![0].proposals[0].decision = "rejected"; },
    (s: AnalysisSession) => { s.state.evidence![0].proposals[0].reviewed = true; },
  ]) { const s = session(); mutate(s); assert.notEqual((await createReceipt(s, date, time)).canonicalPayloadHash, baseline.canonicalPayloadHash); }
  assert.notEqual((await createReceipt(session(), "2026-10-11", time)).canonicalPayloadHash, baseline.canonicalPayloadHash);
});
test("receipt transfer contains no raw content, filenames, parties, source quotes or provider secret fields", async () => {
  const s = session(); Object.assign(s, { OPENAI_API_KEY: "synthetic-secret-marker" });
  Object.assign(s.analysis, { providerSecret: "synthetic-secret-marker" });
  const text = JSON.stringify(await createReceipt(s, date, time));
  for (const forbidden of ["PRIVATE-", "private-obligation-id", "private-evidence-id", "OPENAI_API_KEY", "providerSecret", "synthetic-secret-marker", "supportingEvidenceQuote", "pages", "filename"]) assert.equal(text.includes(forbidden), false, forbidden);
});
test("strict receipt schema rejects extra fields, bad versions, hashes and malformed dates", async () => {
  const r = await createReceipt(session(), date, time);
  for (const changed of [{ ...r, rawText: "hidden" }, { ...r, receiptVersion: "2" }, { ...r, documentFingerprint: "bad" }, { ...r, createdAt: "yesterday" }, { ...r, statusAsOf: "2026-02-30" }, { ...r, reviewedObligations: ["a".repeat(64)] }]) {
    assert.equal(ReceiptSchema.safeParse(changed).success, false); assert.equal((await verifyReceipt(changed, nodeDigest)).valid, false);
  }
});
test("verifier rejects mutated hashes and identifiers", async () => {
  const r = await createReceipt(session(), date, time);
  for (const field of ["canonicalPayloadHash", "obligationSnapshotHash", "evidenceSnapshotHash"] as const) assert.equal((await verifyReceipt({ ...r, [field]: "0".repeat(64) }, nodeDigest)).valid, false);
  assert.equal((await verifyReceipt({ ...r, receiptId: `clauseops-v1-${"0".repeat(64)}` }, nodeDigest)).valid, false);
});
test("verifier rejects inconsistent metadata even when an attacker recomputes hashes", async () => {
  const r = await createReceipt(session(), date, time);
  for (const mutate of [
    (x: typeof r) => { x.unresolvedReviewCount = 1; },
    (x: typeof r) => { x.operationalStateSummary.Completed = 1; },
    (x: typeof r) => { x.acceptedEvidenceLinks = []; },
    (x: typeof r) => { x.obligations.push(x.obligations[0]); },
    (x: typeof r) => { x.evidence[0].proposals[0].obligationId = "c".repeat(64); },
    (x: typeof r) => { x.evidence[0].proposals[0].quoteVerified = false; },
    (x: typeof r) => { x.obligations[0].sourceVerified = false; },
  ]) {
    const changed = structuredClone(r); mutate(changed);
    const { receiptId: _id, canonicalPayloadHash: _hash, obligationSnapshotHash: _o, evidenceSnapshotHash: _e, ...body } = changed;
    void _id; void _hash; void _o; void _e;
    assert.equal((await verifyReceipt(await sealReceipt(body, nodeDigest), nodeDigest)).valid, false);
  }
});
test("empty analysis yields a valid zero-obligation receipt with no false approvals", async () => {
  const s = session(); s.analysis.obligations = []; s.state.evidence = [];
  const r = await createReceipt(s, date, time);
  assert.equal(r.obligations.length, 0); assert.equal(r.unresolvedReviewCount, 0);
  assert.deepEqual(r.reviewedObligations, []); assert.equal((await verifyReceipt(r, nodeDigest)).valid, true);
});
test("unverified sources preserve unresolved review state", async () => {
  const s = session(); s.analysis.obligations[0].sourceVerified = false;
  const r = await createReceipt(s, date, time);
  assert.equal(r.unresolvedReviewCount, 1); assert.equal(r.operationalStateSummary["Needs Review"], 1);
});

test("accepted evidence awaiting explicit review remains an unresolved review in the receipt", async () => {
  const s = session(); s.state.evidence![0].proposals[0].needsHumanReview = true;
  const r = await createReceipt(s, date, time);
  assert.equal(r.acceptedEvidenceLinks.length, 1); assert.equal(r.unresolvedReviewCount, 1);
  assert.equal(r.operationalStateSummary["Needs Review"], 1);
  assert.equal((await verifyReceipt(r, nodeDigest)).valid, true);
});

test("snapshot set order does not change canonical receipt identity", async () => {
  const s = session();
  s.analysis.obligations.push({ ...s.analysis.obligations[0], id: "second-id" });
  s.state.evidence![0].proposals.push({ ...s.state.evidence![0].proposals[0], obligationId: "second-id" });
  const before = await createReceipt(s, date, time);
  s.analysis.obligations.reverse(); s.state.evidence![0].proposals.reverse();
  assert.equal((await createReceipt(s, date, time)).canonicalPayloadHash, before.canonicalPayloadHash);
});
