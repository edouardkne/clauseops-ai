import type { AnalysisSession } from "../intelligence/types";
import { deriveIntelligence } from "../intelligence/engine";
import { withEvidence } from "../evidence/logic";
import { canonicalize, compareIds, sealReceipt, statuses, verifyReceipt, type ComplianceReceipt } from "./core";

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

// Explicit allowlist projection. Full analysis / evidence interpretation are hashed
// locally but never included in the transferable receipt. No environment access.
export async function createReceipt(session: AnalysisSession, statusAsOf: string, createdAt: string): Promise<ComplianceReceipt> {
  const state = withEvidence(session.state, session.state.evidence || []);
  const intelligence = deriveIntelligence(session.analysis, state, statusAsOf);
  const ids = new Map(await Promise.all(intelligence.obligations.map(async o => [o.id, await sha256(`obligation:${o.id}`)] as const)));
  const obligations = intelligence.obligations.map(o => ({
    id: ids.get(o.id)!, status: o.operationalStatus, reviewRequired: o.reviewRequired,
    completionRecorded: o.completionRecorded, sourceVerified: o.sourceVerified, confidence: o.confidence,
  }));
  const evidence = await Promise.all((state.evidence || []).map(async e => ({
    id: await sha256(`evidence:${e.id}`), fingerprint: e.fingerprint,
    proposals: await Promise.all(e.proposals.map(async p => ({
      obligationId: ids.get(p.obligationId) || "", decision: p.decision, reviewed: p.reviewed,
      quoteVerified: p.quoteVerified, validityVerified: p.validityVerified, needsHumanReview: p.needsHumanReview,
      interpretationHash: await sha256(canonicalize(p)),
    }))),
  })));
  const receipt = await sealReceipt({
    receiptVersion: "1", createdAt, statusAsOf, documentFingerprint: session.key,
    analysisFingerprint: await sha256(canonicalize({ ...session.analysis, obligations: [...session.analysis.obligations].sort(compareIds) })),
    obligations, evidence, reviewedObligations: [],
    acceptedEvidenceLinks: evidence.flatMap(e => e.proposals.filter(p => p.decision === "accepted").map(p => ({ evidenceId: e.id, obligationId: p.obligationId }))),
    unresolvedReviewCount: intelligence.reviewQueue.length,
    operationalStateSummary: Object.fromEntries(statuses.map(s => [s, obligations.filter(o => o.status === s).length])) as ComplianceReceipt["operationalStateSummary"],
  }, sha256);
  if (!(await verifyReceipt(receipt, sha256)).valid) throw new Error("Inconsistent receipt snapshot");
  return receipt;
}
