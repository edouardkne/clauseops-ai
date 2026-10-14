import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  createLocalReceiptPreview,
  parseUntrustedCreGatewayAcknowledgement,
  parseUntrustedCreVerificationResult,
  transitionVerificationState,
  UntrustedAuthenticatedCreResultMetadataSchema,
  UntrustedAttestationMetadataSchema,
  UntrustedCreSimulationMetadataSchema,
  UntrustedCreGatewayAcknowledgementSchema,
  UntrustedSubmissionAcknowledgementSchema,
} from "../lib/receipts/lifecycle";
import { sealReceipt, statuses, type ComplianceReceipt } from "../lib/receipts/core";

const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const checkedAt = "2026-10-14T00:00:00.000Z";

async function receipt(): Promise<ComplianceReceipt> {
  return sealReceipt({
    receiptVersion: "1",
    createdAt: checkedAt,
    statusAsOf: "2026-10-14",
    documentFingerprint: "a".repeat(64),
    analysisFingerprint: "b".repeat(64),
    obligations: [],
    evidence: [],
    reviewedObligations: [],
    acceptedEvidenceLinks: [],
    unresolvedReviewCount: 0,
    operationalStateSummary: Object.fromEntries(statuses.map(status => [status, 0])) as ComplianceReceipt["operationalStateSummary"],
  }, digest);
}

test("lifecycle advances only from a local preview to locally verified integrity", async () => {
  const value = await receipt();
  const preview = createLocalReceiptPreview(value);
  assert.deepEqual(preview, { status: "local-preview", receiptId: value.receiptId });

  const validated = await transitionVerificationState(preview, {
    type: "validate-local-integrity",
    receipt: value,
    checkedAt,
  }, digest);
  assert.deepEqual(validated, {
    status: "local-integrity-valid",
    receiptId: value.receiptId,
    scope: "payload-integrity-only",
    validatedAt: checkedAt,
  });
});

test("local integrity transition rejects mismatched, tampered, and malformed receipts", async () => {
  const value = await receipt();
  const preview = createLocalReceiptPreview(value);
  await assert.rejects(transitionVerificationState(preview, {
    type: "validate-local-integrity",
    receipt: { ...value, receiptId: `clauseops-v1-${"c".repeat(64)}` },
    checkedAt,
  }, digest), /Receipt ID does not match/);

  const invalid = await transitionVerificationState(preview, {
    type: "validate-local-integrity",
    receipt: { ...value, canonicalPayloadHash: "c".repeat(64) },
    checkedAt,
  }, digest);
  assert.equal(invalid.status, "failed");
  if (invalid.status === "failed") assert.equal(invalid.stage, "local-validation");

  await assert.rejects(transitionVerificationState(preview, {
    type: "validate-local-integrity",
    receipt: { ...value, rawText: "private document text" },
    checkedAt,
  }, digest), /Unsupported verification lifecycle transition/);
});

test("gateway acknowledgements and other external claims have no enabled lifecycle transition", async () => {
  const value = await receipt();
  const preview = createLocalReceiptPreview(value);
  const unsupportedClaims = [
    { type: "cre-simulation-completed", result: { valid: true, scope: "payload-integrity-only", errors: [], receiptId: value.receiptId } },
    { type: "gateway-acknowledged", status: "ACCEPTED", workflowId: "workflow-1", runId: "run-1" },
    { type: "receipt-submitted", submissionId: "made-up", receiptId: value.receiptId },
    { type: "verification-pending", submissionId: "made-up", receiptId: value.receiptId },
    { type: "authenticated-cre-result", result: { valid: true, scope: "payload-integrity-only", errors: [], receiptId: value.receiptId } },
    { type: "attestation-verified", attestationId: "made-up", receiptId: value.receiptId },
  ];
  for (const claim of unsupportedClaims) {
    await assert.rejects(transitionVerificationState(preview, claim, digest), /Unsupported verification lifecycle transition/);
  }
});

test("untrusted CRE result metadata is strict and never authenticates its source", async () => {
  const value = await receipt();
  const rawResult = { valid: true, scope: "payload-integrity-only", errors: [], receiptId: value.receiptId };
  assert.deepEqual(parseUntrustedCreVerificationResult(rawResult, value.receiptId), rawResult);
  assert.equal(parseUntrustedCreVerificationResult({ ...rawResult, provider: "Chainlink" }, value.receiptId), null);
  assert.equal(parseUntrustedCreVerificationResult({ ...rawResult, valid: false }, value.receiptId), null);
  assert.equal(parseUntrustedCreVerificationResult(rawResult, `clauseops-v1-${"d".repeat(64)}`), null);
  assert.equal(parseUntrustedCreVerificationResult({ ...rawResult, scope: "don-attested" }, value.receiptId), null);
});

test("submission, authenticated-result, attestation, and simulation metadata reject invalid shapes", async () => {
  const value = await receipt();
  const validResult = { valid: true, scope: "payload-integrity-only", errors: [], receiptId: value.receiptId };
  assert.equal(UntrustedSubmissionAcknowledgementSchema.safeParse({
    submissionId: "submission-1", receiptId: value.receiptId, status: "queued", acceptedAt: checkedAt,
  }).success, true);
  assert.equal(UntrustedSubmissionAcknowledgementSchema.safeParse({
    submissionId: "submission-1", receiptId: value.receiptId, status: "verified", acceptedAt: checkedAt,
  }).success, false);
  assert.equal(UntrustedAuthenticatedCreResultMetadataSchema.safeParse({
    receiptId: value.receiptId, workflowId: "workflow-1", runId: "run-1", receivedAt: checkedAt, result: validResult,
  }).success, true);
  assert.equal(UntrustedAuthenticatedCreResultMetadataSchema.safeParse({
    receiptId: `clauseops-v1-${"e".repeat(64)}`, workflowId: "workflow-1", runId: "run-1", receivedAt: checkedAt, result: validResult,
  }).success, false);
  assert.equal(UntrustedAttestationMetadataSchema.safeParse({
    receiptId: value.receiptId, workflowId: "workflow-1", runId: "run-1", attestationId: "proof-1", verifiedAt: checkedAt,
  }).success, true);
  assert.equal(UntrustedAttestationMetadataSchema.safeParse({
    receiptId: value.receiptId, workflowId: "workflow-1", runId: "run-1", attestationId: "proof-1", verifiedAt: "yesterday",
  }).success, false);
  assert.equal(UntrustedCreSimulationMetadataSchema.safeParse({
    mode: "simulation", workflowName: "receipt-check", completedAt: checkedAt, result: validResult,
  }).success, true);
  assert.equal(UntrustedCreSimulationMetadataSchema.safeParse({
    mode: "production", workflowName: "receipt-check", completedAt: checkedAt, result: validResult,
  }).success, false);
});

test("gateway ACCEPTED acknowledgements are strict, correlated, and not verification results", async () => {
  const value = await receipt();
  const workflowId = "a".repeat(64);
  const acknowledgement = {
    jsonrpc: "2.0",
    id: "synthetic-request-1",
    method: "workflows.execute",
    result: {
      workflow_id: `0x${workflowId}`,
      workflow_execution_id: "synthetic-execution-1",
      status: "ACCEPTED",
    },
  };

  assert.deepEqual(
    parseUntrustedCreGatewayAcknowledgement(acknowledgement, "synthetic-request-1", workflowId),
    acknowledgement,
  );
  assert.equal(
    parseUntrustedCreGatewayAcknowledgement(acknowledgement, "different-request", workflowId),
    null,
  );
  assert.equal(
    parseUntrustedCreGatewayAcknowledgement(acknowledgement, "synthetic-request-1", "b".repeat(64)),
    null,
  );
  assert.equal(
    UntrustedCreGatewayAcknowledgementSchema.safeParse({
      ...acknowledgement,
      result: { ...acknowledgement.result, status: "VERIFIED" },
    }).success,
    false,
  );
  assert.equal(
    UntrustedCreGatewayAcknowledgementSchema.safeParse({
      ...acknowledgement,
      result: { ...acknowledgement.result, valid: true },
    }).success,
    false,
  );
  assert.equal(parseUntrustedCreVerificationResult(acknowledgement, value.receiptId), null);
});

test("receipt payload and local lifecycle state contain no private document content", async () => {
  const value = await receipt();
  const preview = createLocalReceiptPreview(value);
  const serialized = JSON.stringify({ receipt: value, preview });
  for (const privateValue of ["PRIVATE-CONTRACT", "private party name", "rawText", "providerSecret", "attestationId"]) {
    assert.equal(serialized.includes(privateValue), false);
  }
});
