import type { ExtractedDocument } from "../pdf/types";
import type { VerifiedMatch } from "./schema";

export type EvidenceProposal = VerifiedMatch & {
  method: "local" | "ai";
  decision: "proposed" | "accepted" | "rejected";
  reviewed: boolean;
};
export type SessionEvidence = {
  id: string; fingerprint: string; filename: string; fileType: string; size: number; addedAt: string;
  extractionStatus: "extracted"; pages: ExtractedDocument["pages"];
  proposals: EvidenceProposal[];
};
