import type { Intelligence } from "../intelligence/types";
import type { LocalAnswer } from "../intelligence/queries";
import { evidenceNeedsReview } from "./logic";

export const EVIDENCE_QUESTIONS = [
  "Which obligations have evidence attached?", "Which obligations are missing evidence?",
  "Show evidence linked to obligation 1.", "Which evidence matches need review?",
  "Which AI evidence suggestions were rejected?", "Which evidence has no accepted obligation?",
] as const;
export function answerEvidenceQuery(question: string, intelligence: Intelligence): LocalAnswer | null {
  const q = question.trim().toLowerCase().replace(/[?!.]+$/g, "").trim();
  const evidence = intelligence.evidence || [];
  const answer = (text: string, obligationIds: string[] = []): LocalAnswer => ({ kind: "local", text, obligationIds: [...new Set(obligationIds)] });
  if (q === "which obligations have evidence attached" || q === "which obligations are missing evidence") {
    const missing = q.includes("missing");
    const selected = intelligence.obligations.filter(o => missing ? o.evidenceRequired.length > 0 && o.mappedEvidenceCount === 0 : o.mappedEvidenceCount > 0);
    return answer(selected.length ? selected.map(o => `#${o.number} ${o.title}: ${o.mappedEvidenceCount} accepted evidence links. ${o.operationalStatus}.`).join("\n") : "No matching obligations in this session.", selected.map(o => o.id));
  }
  const source = q.match(/^show evidence linked to obligation\s+#?(.+)$/);
  if (source) {
    const ref = source[1];
    const obligation = intelligence.obligations.find(o => /^\d+$/.test(ref) ? o.number === Number(ref) : o.id.toLowerCase() === ref || o.title.toLowerCase() === ref);
    if (!obligation) return answer("That obligation was not found in the active contract.");
    const linked = evidence.filter(e => e.proposals.some(p => p.obligationId === obligation.id && p.decision === "accepted"));
    return answer(linked.length ? linked.map(e => `${e.filename}: accepted association, not proof of legal sufficiency.`).join("\n") : "No accepted evidence is linked to this obligation.", [obligation.id]);
  }
  if (q === "which evidence matches need review" || q === "which ai evidence suggestions were rejected") {
    const rejected = q.includes("rejected");
    const selected = evidence.flatMap(e => e.proposals.filter(p => rejected ? p.method === "ai" && p.decision === "rejected" : evidenceNeedsReview(p)).map(p => ({ e, p })));
    return answer(selected.length ? selected.map(({e,p}) => `${e.filename} -> ${intelligence.obligations.find(o => o.id === p.obligationId)?.title || p.obligationId}: ${rejected ? "Rejected by user" : p.reviewReason || "Needs human review"}`).join("\n\n") : "No matching evidence suggestions in this session.", selected.map(({p}) => p.obligationId));
  }
  if (q === "which evidence has no accepted obligation") {
    const selected = evidence.filter(e => !e.proposals.some(p => p.decision === "accepted"));
    return answer(selected.length ? selected.map(e => e.filename).join("\n") : "No unlinked evidence documents in this session.");
  }
  return null;
}
