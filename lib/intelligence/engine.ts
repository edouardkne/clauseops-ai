import type { VerifiedContractAnalysis, VerifiedObligation } from "../ai/contract-analysis-schema";
import type { Deadline, Intelligence, IntelligentObligation, OperationalState, OperationalStatus } from "./types";
import { evidenceNeedsReview } from "../evidence/logic";

const months = new Map([
  ["january", 1], ["february", 2], ["march", 3], ["april", 4], ["may", 5], ["june", 6],
  ["july", 7], ["august", 8], ["september", 9], ["october", 10], ["november", 11], ["december", 12],
]);

function validCalendarDate(year: number, month: number, day: number): string | null {
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseExplicitCalendarDate(value: string): string | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return validCalendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const written = value.match(/^(?:(?:no later than|by|on)\s+)?([a-z]+)\s+(\d{1,2}),?\s+(\d{4})\.?$/i);
  if (!written) return null;
  const month = months.get(written[1].toLowerCase());
  return month ? validCalendarDate(Number(written[3]), month, Number(written[2])) : null;
}

export function normalizeDeadline(text: string | null, recurrence: string | null): Deadline {
  const value = text?.trim() || "";
  if (recurrence?.trim() || /\b(?:every|each)\s+(?:day|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(?:daily|weekly|monthly|annually)\b/i.test(value)) {
    return {
      kind: "recurring", date: null,
      reason: "A recurrence is present; confirm the applicable occurrence before using a calendar date. Original deadline wording is preserved.",
    };
  }
  if (!value) return { kind: "missing", date: null, reason: null };
  if (/\b(?:within\s+\d+\s+(?:business\s+)?(?:days?|weeks?|months?)\s+(?:of|after)\s+(?:the\s+)?(?:receipt|delivery|execution|effective date|approval|notice|request|completion|commencement)|(?:upon|after|following)\s+(?:the\s+)?(?:receipt|delivery|execution|effective date|approval|notice|request|completion|commencement))\b/i.test(value)) {
    return {
      kind: "event-dependent", date: null,
      reason: "Deadline depends on an event or trigger; confirm the trigger date before calculating a calendar deadline. No date has been inferred.",
    };
  }
  const date = parseExplicitCalendarDate(value);
  if (date && !recurrence?.trim()) return { kind: "date", date, reason: null };
  return {
    kind: "unresolved", date: null,
    reason: "Deadline wording cannot safely be converted to a calendar date. Confirm the date or triggering event; no date has been inferred.",
  };
}

export function deriveReviewReasons(obligation: VerifiedObligation, deadline: Deadline): string[] {
  const reasons: string[] = [];
  if (obligation.confidence === "inferred") reasons.push("This obligation is inferred rather than directly stated.");
  if (obligation.confidence === "uncertain") reasons.push("The AI interpretation is uncertain.");
  if (!obligation.sourceVerified) reasons.push("The supporting quote is not verified on its claimed source page.");
  if (!obligation.responsibleParty?.trim()) reasons.push("No responsible party is specified; responsibility needs confirmation.");
  if (deadline.reason) reasons.push(deadline.reason);
  if (obligation.reviewReason?.trim()) reasons.push(obligation.reviewReason.trim());
  if (obligation.needsHumanReview && !obligation.reviewReason?.trim()) reasons.push("The original analysis explicitly requested human review without a specific reason.");
  return [...new Set(reasons)];
}

function statusFor(o: VerifiedObligation, deadline: Deadline, reasons: string[], completed: boolean, mappedEvidenceCount: number, asOf: string): { status: OperationalStatus; reason: string } {
  if (reasons.length) return { status: "Needs Review", reason: "Human review takes priority over deadline and completion assumptions." };
  const missingEvidence = o.evidenceRequired.length > 0 && mappedEvidenceCount === 0;
  if (completed && !missingEvidence) return { status: "Completed", reason: "Task completion was recorded by the user in this session. This is not a compliance verdict." };
  if (completed && missingEvidence) return { status: "Missing Evidence", reason: "Task completion is recorded, but no session evidence is mapped to this requirement." };
  if (missingEvidence) return { status: "Missing Evidence", reason: "Evidence is required, but no evidence is accepted in this session. This does not establish that evidence is absent elsewhere; the original deadline remains visible." };
  if (deadline.date) {
    const days = (Date.parse(`${deadline.date}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000;
    if (days < 0) return { status: "Overdue", reason: "The explicit calendar deadline has passed and task completion is not recorded." };
    if (days <= 7) return { status: "Due Soon", reason: "The explicit calendar deadline is today or within seven days; completion is not recorded." };
  }
  return { status: "Pending", reason: "No task completion is recorded. Missing dates remain unspecified." };
}

export function deriveIntelligence(analysis: VerifiedContractAnalysis, state: OperationalState, asOf: string): Intelligence {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(Date.parse(`${asOf}T00:00:00Z`))) throw new Error("An explicit evaluation date is required.");
  const obligations: IntelligentObligation[] = analysis.obligations.map((o, index) => {
    const deadline = normalizeDeadline(o.deadlineText, o.recurrence);
    const reviewReasons = deriveReviewReasons(o, deadline);
    for (const evidence of state.evidence || []) {
      for (const proposal of evidence.proposals.filter(p => p.obligationId === o.id && evidenceNeedsReview(p))) {
        reviewReasons.push(`Evidence ${evidence.filename}: ${proposal.reviewReason || "Evidence relevance needs human review."}`);
      }
    }
    const completionRecorded = state.completed[o.id] === true;
    const mappedEvidenceCount = new Set(state.evidenceLinks.filter(e => e.obligationId === o.id && e.evidenceId.trim()).map(e => e.evidenceId)).size;
    const status = statusFor(o, deadline, reviewReasons, completionRecorded, mappedEvidenceCount, asOf);
    return { ...o, number: index + 1, deadline, reviewReasons, reviewRequired: reviewReasons.length > 0, operationalStatus: status.status, statusReason: status.reason, completionRecorded, mappedEvidenceCount };
  });
  const count = (predicate: (o: IntelligentObligation) => boolean) => obligations.filter(predicate).length;
  return {
    asOf, obligations, evidence: state.evidence || [], reviewQueue: obligations.filter(o => o.reviewRequired),
    summary: {
      total: obligations.length,
      direct: count(o => o.confidence === "direct"), inferred: count(o => o.confidence === "inferred"), uncertain: count(o => o.confidence === "uncertain"),
      needsReview: count(o => o.reviewRequired), verified: count(o => o.sourceVerified), unverified: count(o => !o.sourceVerified),
      withDeadlines: count(o => !!o.deadlineText?.trim()), requiringEvidence: count(o => o.evidenceRequired.length > 0),
      missingResponsibleParty: count(o => !o.responsibleParty?.trim()), withoutClearDeadline: count(o => o.deadline.kind !== "date"),
    },
  };
}
