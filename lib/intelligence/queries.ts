import type { Intelligence, IntelligentObligation } from "./types";

export const LOCAL_QUESTIONS = [
  "How many obligations were found?", "What are the main obligations?", "Which obligations need human review?",
  "Which obligations require evidence?", "Which obligations have verified sources?", "Which citations are unverified?",
  "Which obligations concern payments?", "Which deadlines were found?", "Which obligations have no responsible party?",
  "Who is responsible for each obligation?", "Show the source for obligation 1.", "Which obligations are inferred?", "Which obligations are uncertain?",
] as const;
export type LocalQuery = "count" | "all" | "review" | "evidence" | "verified" | "unverified" | "payment" | "deadlines" | "unassigned" | "owners" | "source" | "inferred" | "uncertain";
export type QueryRoute = { kind: "local"; query: LocalQuery; reference?: string } | { kind: "synthesis" };
export type LocalAnswer = { kind: "local" | "synthesis"; text: string; obligationIds: string[] };

export function routeQuery(question: string): QueryRoute {
  const q = question.trim().toLowerCase().replace(/[?!.]+$/g, "").trim();
  const source = q.match(/^(?:show (?:me )?(?:the )?source(?: clause)? for|source for) obligation\s+#?(.+)$/);
  if (source) return { kind: "local", query: "source", reference: source[1].trim() };
  // Anchored patterns deliberately avoid treating arbitrary synthesis questions
  // containing a keyword as a complete deterministic answer.
  const rules: [RegExp, LocalQuery][] = [
    [/^(how many obligations(?: were found| are there)?|count obligations)$/, "count"],
    [/^(what are the main obligations|(?:show|list)(?: all)?(?: the)? obligations)$/, "all"],
    [/^(which obligations (?:need|require) (?:human )?review|(?:show|list)(?: the)? review queue)$/, "review"],
    [/^(which obligations (?:require|need) evidence|(?:show|list) evidence requirements)$/, "evidence"],
    [/^(which obligations have verified sources|which (?:sources|citations) are verified)$/, "verified"],
    [/^(which (?:citations|sources) are unverified|which obligations have unverified sources)$/, "unverified"],
    [/^(which obligations (?:concern|relate to) payments?|(?:show|list) payment obligations)$/, "payment"],
    [/^(which deadlines were found|(?:show|list)(?: all)? deadlines|what are the deadlines)$/, "deadlines"],
    [/^(which obligations have no responsible party|which obligations are unassigned)$/, "unassigned"],
    [/^(who is responsible for each obligation|(?:show|list) (?:responsible parties|owners))$/, "owners"],
    [/^(which obligations are inferred|(?:show|list) inferred obligations)$/, "inferred"],
    [/^(which obligations are uncertain|(?:show|list) uncertain obligations)$/, "uncertain"],
  ];
  for (const [pattern, query] of rules) if (pattern.test(q)) return { kind: "local", query };
  return { kind: "synthesis" };
}

export function answerQuery(question: string, intelligence: Intelligence): LocalAnswer {
  const route = routeQuery(question);
  if (route.kind === "synthesis") return { kind: "synthesis", text: "This question needs synthesis beyond the supported local lookups. Generative assistance is not enabled, and no provider was contacted. Try one of the suggested questions or review the source clauses.", obligationIds: [] };
  const all = intelligence.obligations;
  if (route.query === "count") return { kind: "local", text: `${all.length} obligations were found in the current document. ${intelligence.summary.needsReview} need human review; ${intelligence.summary.verified} citations are verified against extracted page text.`, obligationIds: [] };
  if (route.query === "source") {
    const reference = route.reference || "";
    const o = /^\d+$/.test(reference) ? all.find(o => o.number === Number(reference)) : all.find(o => o.id.toLowerCase() === reference || o.title.toLowerCase() === reference);
    return o
      ? { kind: "local", text: `#${o.number} ${o.title}\nSource page ${o.source.pageNumber} · ${o.sourceVerified ? "Quote verified" : "Quote unverified"}\n“${o.source.quote}”\nA text match is not a legal or semantic validation.`, obligationIds: [o.id] }
      : { kind: "local", text: "That obligation was not found in the current document. Use its displayed number, full ID, or exact title.", obligationIds: [] };
  }
  const predicates: Partial<Record<LocalQuery, (o: IntelligentObligation) => boolean>> = {
    review: o => o.reviewRequired, evidence: o => o.evidenceRequired.length > 0,
    verified: o => o.sourceVerified, unverified: o => !o.sourceVerified,
    payment: o => o.category === "payment", deadlines: o => !!o.deadlineText?.trim(),
    unassigned: o => !o.responsibleParty?.trim(), inferred: o => o.confidence === "inferred", uncertain: o => o.confidence === "uncertain",
  };
  const selected = all.filter(predicates[route.query] || (() => true));
  const detail = (o: IntelligentObligation) => route.query === "review" ? o.reviewReasons.join(" ")
    : route.query === "evidence" ? `Requires: ${o.evidenceRequired.join("; ")}`
    : route.query === "deadlines" ? `Deadline: ${o.deadlineText}${o.deadline.kind !== "date" ? " — not normalized; review required" : ""}`
    : route.query === "owners" || route.query === "unassigned" ? `Responsible party: ${o.responsibleParty?.trim() || "Not specified"}`
    : o.action;
  return {
    kind: "local",
    text: selected.length ? `${selected.length} matching obligations${route.query === "all" ? " (document order, not an AI priority ranking)" : route.query === "payment" ? " (payment category only)" : ""}:\n\n${selected.map(o => `#${o.number} ${o.title}\n${detail(o)}\nPage ${o.source.pageNumber} · ${o.sourceVerified ? "Quote verified" : "Quote unverified"}`).join("\n\n")}` : "No matching obligations in the current structured analysis. This does not establish that the full document has no such requirements.",
    obligationIds: selected.map(o => o.id),
  };
}
