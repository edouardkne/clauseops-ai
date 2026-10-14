import { verifySourceQuote } from "../ai/verify-sources";
import type { VerifiedObligation } from "../ai/contract-analysis-schema";
import type { ExtractedDocument } from "../pdf/types";
import type { OperationalState } from "../intelligence/types";
import { documentContentFingerprint, documentFingerprint } from "../intelligence/analysis-cache";
import { EvidenceModelSchema, type Candidate, type EvidenceRequest, type VerifiedMatch } from "./schema";
import type { EvidenceProposal, SessionEvidence } from "./types";

export function verifyEvidenceMatches(raw: unknown, input: EvidenceRequest): VerifiedMatch[] {
  const parsed = EvidenceModelSchema.parse(raw);
  const ids = new Set(input.obligations.map(o => o.id));
  const seen = new Set<string>();
  return parsed.matches.map(match => {
    if (!ids.has(match.obligationId) || seen.has(match.obligationId)) throw new Error("Invalid match target");
    seen.add(match.obligationId);
    const page = input.evidence.pages.find(p => p.pageNumber === match.pageNumber)?.text;
    const quoteVerified = verifySourceQuote(page, match.supportingEvidenceQuote);
    const validityVerified = match.validityText === null || verifySourceQuote(page, match.validityText);
    const reasons = [match.reviewReason?.trim()].filter(Boolean);
    if (!quoteVerified) reasons.push("The evidence quote could not be verified on the claimed page. This proposal cannot be accepted.");
    if (!validityVerified) reasons.push("Validity or expiry wording is not verified. No expiry date has been inferred.");
    if (match.match === "possible" || match.match === "weak") reasons.push("The relevance of this evidence is uncertain and needs human review.");
    if (match.needsHumanReview && !reasons.length) reasons.push("The model requested human review of this proposal.");
    return { ...match, match: quoteVerified ? match.match : "weak", quoteVerified, validityVerified,
      needsHumanReview: match.needsHumanReview || reasons.length > 0, reviewReason: reasons.join(" ") || null };
  });
}

const words = (text: string) => new Set(text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []);
const categoryTerms: Record<string, string[]> = {
  payment: ["invoice", "payment", "receipt", "remittance", "facture", "paiement"],
  financial: ["financial", "expenditure", "budget"], reporting: ["report", "rapport"],
  insurance: ["insurance", "policy", "assurance"], data_protection: ["privacy", "data protection"],
};
export function candidateShortlist(document: Pick<ExtractedDocument, "filename" | "pages">, obligations: VerifiedObligation[]): Candidate[] {
  const content = `${document.filename} ${document.pages.map(p => p.text).join(" ")}`.toLowerCase();
  const tokens = words(content);
  return obligations.map(o => {
    const terms = words(`${o.title} ${o.action} ${o.evidenceRequired.join(" ")}`);
    const overlap = [...terms].filter(term => tokens.has(term)).length;
    const category = (categoryTerms[o.category] || []).some(term => content.includes(term));
    return { o, score: (content.includes(o.id.toLowerCase()) ? 100 : 0) + overlap + (category ? 3 : 0) };
  }).filter(item => item.score >= 2).sort((a, b) => b.score - a.score || a.o.id.localeCompare(b.o.id)).slice(0, 8)
    .map(({ o }) => toCandidate(o));
}
export function toCandidate(o: VerifiedObligation): Candidate {
  return { id: o.id, title: o.title, action: o.action, category: o.category, evidenceRequired: [...o.evidenceRequired] };
}
export function localProposals(document: ExtractedDocument, obligations: VerifiedObligation[]): EvidenceProposal[] {
  // Only literal identifiers or complete multi-word requirements yield local proposals.
  // Filename/category clues narrow candidates, but never establish a trusted link.
  return obligations.flatMap(o => {
    for (const page of document.pages) {
      const lower = page.text.toLowerCase();
      const terms = [o.id, ...o.evidenceRequired.filter(term => words(term).size >= 2)];
      const term = terms.find(term => lower.includes(term.toLowerCase()));
      if (!term) continue;
      const index = lower.indexOf(term.toLowerCase());
      const quote = page.text.slice(Math.max(0, index - 60), Math.min(page.text.length, index + term.length + 100));
      return [{ obligationId: o.id, match: "strong" as const, explanation: "This document appears relevant because it contains the obligation identifier or the exact evidence requirement wording. A literal match does not establish sufficiency.",
        pageNumber: page.pageNumber, supportingEvidenceQuote: quote, quoteVerified: true, validityText: null, validityVerified: true,
        needsHumanReview: false, reviewReason: null, method: "local" as const, decision: "proposed" as const, reviewed: false }];
    }
    return [];
  });
}
export async function createEvidence(document: ExtractedDocument, obligations: VerifiedObligation[]): Promise<SessionEvidence> {
  return { id: crypto.randomUUID(), fingerprint: await documentFingerprint({ filename: document.filename, pages: document.pages }),
    contentFingerprint: await documentContentFingerprint({ pages: document.pages }),
    filename: document.filename, fileType: document.mimeType, size: document.size, addedAt: new Date().toISOString(),
    extractionStatus: "extracted", pages: document.pages, proposals: localProposals(document, obligations) };
}
export function mergeProposals(evidence: SessionEvidence, matches: VerifiedMatch[]): SessionEvidence {
  const proposals = [...evidence.proposals];
  for (const match of matches) {
    if (match.match === "none") continue;
    const index = proposals.findIndex(p => p.obligationId === match.obligationId);
    // User decisions and reviews win over new/cached model proposals.
    if (index >= 0 && (proposals[index].decision !== "proposed" || proposals[index].reviewed)) continue;
    const proposal: EvidenceProposal = { ...match, method: "ai", decision: "proposed", reviewed: false };
    if (index < 0) proposals.push(proposal); else proposals[index] = proposal;
  }
  return { ...evidence, proposals };
}
export function decideMatch(evidence: SessionEvidence, obligationId: string, action: "accept" | "reject" | "review"): SessionEvidence {
  return { ...evidence, proposals: evidence.proposals.map(p => {
    if (p.obligationId !== obligationId || p.decision === "rejected") return p;
    if (action === "reject") return { ...p, decision: "rejected" };
    if (!p.quoteVerified || !p.validityVerified || p.match === "none") return p;
    if (action === "review") return { ...p, reviewed: true };
    return { ...p, decision: "accepted" };
  }) };
}
export function evidenceNeedsReview(p: EvidenceProposal) {
  return p.decision !== "rejected" && (!p.quoteVerified || !p.validityVerified || (p.needsHumanReview && !p.reviewed));
}
export function withEvidence(state: OperationalState, evidence: SessionEvidence[]): OperationalState {
  return { ...state, evidence, evidenceLinks: evidence.flatMap(e => e.proposals.filter(p => p.decision === "accepted" && p.quoteVerified && p.validityVerified).map(p => ({ evidenceId: e.id, obligationId: p.obligationId }))) };
}
export async function matchingKey(input: EvidenceRequest) {
  const canonical = JSON.stringify({ evidence: { filename: input.evidence.filename, pages: [...input.evidence.pages].sort((a,b) => a.pageNumber-b.pageNumber).map(p => ({ pageNumber: p.pageNumber, text: p.text })) }, obligations: [...input.obligations].sort((a,b) => a.id.localeCompare(b.id)) });
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}
export class EvidenceMatchCache {
  private entries = new Map<string, Promise<VerifiedMatch[]>>();
  run(key: string, match: () => Promise<VerifiedMatch[]>) {
    const cached = this.entries.get(key);
    if (cached) return cached;
    const pending = Promise.resolve().then(match).catch(error => { if (this.entries.get(key) === pending) this.entries.delete(key); throw error; });
    this.entries.set(key, pending);
    return pending;
  }
  clear() { this.entries.clear(); }
}
