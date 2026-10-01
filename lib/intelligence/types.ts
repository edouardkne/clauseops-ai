import type { VerifiedContractAnalysis, VerifiedObligation } from "../ai/contract-analysis-schema";

export type OperationalStatus = "Pending" | "Due Soon" | "Overdue" | "Missing Evidence" | "Needs Review" | "Completed";
export type Deadline = { kind: "date" | "missing" | "unresolved"; date: string | null; reason: string | null };
// Future evidence matching can attach references here, without changing AI output.
// References are associations, not proof of validity, authenticity, or expiry.
export type EvidenceLink = { evidenceId: string; obligationId: string };
export type OperationalState = { completed: Record<string, boolean>; evidenceLinks: EvidenceLink[] };
export type IntelligentObligation = VerifiedObligation & {
  number: number;
  deadline: Deadline;
  reviewReasons: string[];
  reviewRequired: boolean;
  operationalStatus: OperationalStatus;
  statusReason: string;
  completionRecorded: boolean;
  mappedEvidenceCount: number;
};
export type IntelligenceSummary = {
  total: number; direct: number; inferred: number; uncertain: number; needsReview: number;
  verified: number; unverified: number; withDeadlines: number; requiringEvidence: number;
  missingResponsibleParty: number; withoutClearDeadline: number;
};
export type GraphNode = { id: string; kind: "document" | "obligation" | "party" | "deadline" | "evidence_requirement" | "source_page" | "source_quote"; label: string };
export type GraphEdge = { from: string; to: string; relation: "contains" | "owned_by" | "has_deadline" | "requires_evidence" | "cites_quote" | "on_page" };
export type ObligationGraph = { nodes: GraphNode[]; edges: GraphEdge[] };
export type Intelligence = { obligations: IntelligentObligation[]; reviewQueue: IntelligentObligation[]; summary: IntelligenceSummary; asOf: string };
export type AnalysisSession = { key: string; filename: string; pageCount: number; analysis: VerifiedContractAnalysis; state: OperationalState };
