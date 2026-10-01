import { ContractAnalysisSchema, type AnalyzeContractRequest, type VerifiedContractAnalysis } from "./contract-analysis-schema";

// Only Unicode compatibility and whitespace are normalised. Case, punctuation,
// wording, page boundaries, and the model's original quote are never repaired.
export function normalizeCitation(value: string) {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function verifySourceQuote(page: string | undefined, quote: string) {
  const normalizedQuote = normalizeCitation(quote);
  return page !== undefined && normalizedQuote.length > 0 && normalizeCitation(page).includes(normalizedQuote);
}

export function verifyAnalysis(raw: unknown, pages: AnalyzeContractRequest["pages"]): VerifiedContractAnalysis {
  // Strict parsing rejects extra model fields, including id/sourceVerified.
  const analysis = ContractAnalysisSchema.parse(raw);
  const byNumber = new Map(pages.map(page => [page.pageNumber, page.text]));
  return {
    ...analysis,
    obligations: analysis.obligations.map(obligation => {
      const sourceVerified = verifySourceQuote(byNumber.get(obligation.source.pageNumber), obligation.source.quote);
      const reasons = [obligation.reviewReason?.trim()].filter(Boolean);
      if (!sourceVerified) reasons.push("The supporting quote could not be matched to the extracted text on the cited page. Check the original PDF; this citation is unverified.");
      if (obligation.confidence !== "direct") reasons.push("This interpretation is inferred or uncertain and requires human review.");
      if (!obligation.responsibleParty?.trim()) reasons.push("The responsible party is not specified; confirm responsibility before acting.");
      const needsHumanReview = obligation.needsHumanReview || reasons.length > 0;
      if (needsHumanReview && reasons.length === 0) reasons.push("The model flagged ambiguity. Review this interpretation against the complete document.");
      return {
        ...obligation,
        id: crypto.randomUUID(),
        sourceVerified,
        confidence: sourceVerified ? obligation.confidence : "uncertain",
        needsHumanReview,
        reviewReason: reasons.length ? reasons.join(" ") : null,
      };
    }),
  };
}
