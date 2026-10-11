import { z } from "zod";

// Portable shared protocol: no Node, browser, provider, or CRE dependencies.
export const statuses = ["Pending", "Due Soon", "Overdue", "Missing Evidence", "Needs Review", "Completed"] as const;
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const count = z.number().int().min(0).max(10000);
const obligation = z.object({
  id: hash, status: z.enum(statuses), reviewRequired: z.boolean(),
  completionRecorded: z.boolean(), sourceVerified: z.boolean(),
  confidence: z.enum(["direct", "inferred", "uncertain"]),
}).strict();
const proposal = z.object({
  obligationId: hash, decision: z.enum(["proposed", "accepted", "rejected"]),
  reviewed: z.boolean(), quoteVerified: z.boolean(), validityVerified: z.boolean(),
  needsHumanReview: z.boolean(), interpretationHash: hash,
}).strict();
const evidence = z.object({ id: hash, fingerprint: hash, proposals: z.array(proposal).max(1000) }).strict();
const link = z.object({ evidenceId: hash, obligationId: hash }).strict();
const summary = z.object({
  Pending: count, "Due Soon": count, Overdue: count, "Missing Evidence": count,
  "Needs Review": count, Completed: count,
}).strict();
export const ReceiptSchema = z.object({
  receiptVersion: z.literal("1"), receiptId: z.string().regex(/^clauseops-v1-[a-f0-9]{64}$/),
  createdAt: z.string().datetime(), statusAsOf: z.string().date(),
  documentFingerprint: hash, analysisFingerprint: hash,
  obligationSnapshotHash: hash, evidenceSnapshotHash: hash,
  obligations: z.array(obligation).max(1000), evidence: z.array(evidence).max(1000),
  // v1 has no obligation approval action. Absence of flags is NOT human approval.
  reviewedObligations: z.array(hash).max(0),
  acceptedEvidenceLinks: z.array(link).max(10000), unresolvedReviewCount: count,
  operationalStateSummary: summary, canonicalPayloadHash: hash,
}).strict();
export type ComplianceReceipt = z.infer<typeof ReceiptSchema>;
export type Digest = (text: string) => string | Promise<string>;

/** Protocol v1: sorted object keys; JSON scalar encoding; explicit array ordering.
 * Reject unsupported values rather than silently dropping fields. Not general JCS.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object" && value && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  throw new Error("Unsupported canonical value");
}
export const compareIds = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
export function normalizedPayload(receipt: Omit<ComplianceReceipt, "receiptId" | "canonicalPayloadHash">) {
  return { ...receipt,
    obligations: [...receipt.obligations].sort(compareIds),
    evidence: [...receipt.evidence].sort(compareIds).map(e => ({ ...e, proposals: [...e.proposals].sort((a, b) => compareIds({ id: a.obligationId }, { id: b.obligationId })) })),
    reviewedObligations: [...receipt.reviewedObligations].sort(),
    acceptedEvidenceLinks: [...receipt.acceptedEvidenceLinks].sort((a, b) => compareIds({ id: a.evidenceId + a.obligationId }, { id: b.evidenceId + b.obligationId })),
  };
}
export async function sealReceipt(input: Omit<ComplianceReceipt, "receiptId" | "canonicalPayloadHash" | "obligationSnapshotHash" | "evidenceSnapshotHash">, digest: Digest): Promise<ComplianceReceipt> {
  const normalized = normalizedPayload({ ...input, obligationSnapshotHash: "", evidenceSnapshotHash: "" });
  normalized.obligationSnapshotHash = await digest(canonicalize(normalized.obligations));
  normalized.evidenceSnapshotHash = await digest(canonicalize(normalized.evidence));
  const canonicalPayloadHash = await digest(canonicalize(normalized));
  return ReceiptSchema.parse({ ...normalized, canonicalPayloadHash, receiptId: `clauseops-v1-${canonicalPayloadHash}` });
}
export type ReceiptVerification = { valid: boolean; scope: "payload-integrity-only"; errors: string[]; receiptId: string | null };
export async function verifyReceipt(input: unknown, digest: Digest): Promise<ReceiptVerification> {
  const parsed = ReceiptSchema.safeParse(input);
  if (!parsed.success) return { valid: false, scope: "payload-integrity-only", errors: ["Invalid receipt structure or version"], receiptId: null };
  const r = parsed.data;
  const errors: string[] = [];
  const { receiptId, canonicalPayloadHash, ...body } = r;
  const payload = normalizedPayload(body);
  if (await digest(canonicalize(payload)) !== canonicalPayloadHash) errors.push("Canonical payload hash mismatch");
  if (receiptId !== `clauseops-v1-${canonicalPayloadHash}`) errors.push("Receipt identifier mismatch");
  if (await digest(canonicalize(payload.obligations)) !== r.obligationSnapshotHash) errors.push("Obligation snapshot hash mismatch");
  if (await digest(canonicalize(payload.evidence)) !== r.evidenceSnapshotHash) errors.push("Evidence snapshot hash mismatch");
  const ids = new Set(r.obligations.map(o => o.id));
  if (ids.size !== r.obligations.length || new Set(r.evidence.map(e => e.id)).size !== r.evidence.length) errors.push("Duplicate snapshot identifiers");
  if (r.unresolvedReviewCount !== r.obligations.filter(o => o.reviewRequired).length) errors.push("Unresolved review count mismatch");
  for (const status of statuses) if (r.operationalStateSummary[status] !== r.obligations.filter(o => o.status === status).length) errors.push("Operational summary mismatch");
  for (const o of r.obligations) {
    if (o.reviewRequired !== (o.status === "Needs Review") || ((!o.sourceVerified || o.confidence !== "direct") && !o.reviewRequired) || (o.status === "Completed" && !o.completionRecorded)) errors.push("Inconsistent obligation metadata");
  }
  const expectedLinks: ComplianceReceipt["acceptedEvidenceLinks"] = [];
  for (const e of r.evidence) {
    if (new Set(e.proposals.map(p => p.obligationId)).size !== e.proposals.length) errors.push("Duplicate evidence proposal");
    for (const p of e.proposals) {
      if (!ids.has(p.obligationId)) errors.push("Unknown obligation reference");
      if (p.decision === "accepted") {
        if (!p.quoteVerified || !p.validityVerified) errors.push("Ungrounded accepted evidence");
        expectedLinks.push({ evidenceId: e.id, obligationId: p.obligationId });
      }
      if (p.decision !== "rejected" && (!p.quoteVerified || !p.validityVerified || (p.needsHumanReview && !p.reviewed)) && !r.obligations.find(o => o.id === p.obligationId)?.reviewRequired) errors.push("Evidence review flag missing");
    }
  }
  if (canonicalize(normalizedPayload({ ...body, acceptedEvidenceLinks: expectedLinks }).acceptedEvidenceLinks) !== canonicalize(payload.acceptedEvidenceLinks)) errors.push("Accepted evidence links mismatch");
  return { valid: errors.length === 0, scope: "payload-integrity-only", errors: [...new Set(errors)], receiptId };
}
