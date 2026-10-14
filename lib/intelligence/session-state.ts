import type { AnalysisSession } from "./types";
import type { SessionEvidence } from "../evidence/types";
import { hasSameDocumentContent } from "./analysis-cache";
import { withEvidence } from "../evidence/logic";

export function addIndependentEvidence(session: AnalysisSession, evidence: SessionEvidence): AnalysisSession {
  if (
    hasSameDocumentContent(session.contentFingerprint, evidence.contentFingerprint) ||
    session.state.evidence?.some(item => hasSameDocumentContent(item.contentFingerprint, evidence.contentFingerprint))
  ) return session;

  const evidenceItems = [...(session.state.evidence || []), evidence];
  return { ...session, state: withEvidence(session.state, evidenceItems) };
}

export function resolveContractReplacement(
  sessions: Map<string, AnalysisSession>,
  current: AnalysisSession | null,
  confirmed: boolean,
): AnalysisSession | null {
  if (!confirmed || !current) return current;
  sessions.delete(current.key);
  return null;
}
