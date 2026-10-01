import type { AnalysisSession, ObligationGraph } from "./types";

// Structural relationships only; no inferred dependencies between obligations.
export function buildObligationGraph(session: Pick<AnalysisSession, "key" | "analysis">): ObligationGraph {
  const nodes = new Map<string, ObligationGraph["nodes"][number]>();
  const edges: ObligationGraph["edges"] = [];
  const add = (id: string, kind: ObligationGraph["nodes"][number]["kind"], label: string) => { nodes.set(id, { id, kind, label }); return id; };
  const connect = (from: string, to: string, relation: ObligationGraph["edges"][number]["relation"]) => { edges.push({ from, to, relation }); };
  const documentId = add(`document:${session.key}`, "document", session.analysis.documentTitle);
  for (const o of session.analysis.obligations) {
    const id = add(`obligation:${o.id}`, "obligation", o.title);
    connect(documentId, id, "contains");
    if (o.responsibleParty?.trim()) connect(id, add(`party:${session.key}:${o.responsibleParty}`, "party", o.responsibleParty), "owned_by");
    if (o.deadlineText?.trim()) connect(id, add(`${id}:deadline`, "deadline", o.deadlineText), "has_deadline");
    o.evidenceRequired.forEach((requirement, i) => connect(id, add(`${id}:evidence:${i}`, "evidence_requirement", requirement), "requires_evidence"));
    const quote = add(`${id}:quote`, "source_quote", o.source.quote);
    const page = add(`${documentId}:page:${o.source.pageNumber}`, "source_page", `Claimed page ${o.source.pageNumber}`);
    connect(id, quote, "cites_quote");
    connect(quote, page, "on_page");
  }
  return { nodes: [...nodes.values()], edges };
}
