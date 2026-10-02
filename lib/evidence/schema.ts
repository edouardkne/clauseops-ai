import { z } from "zod/v4";
import { AnalyzeContractRequestSchema, ObligationCategorySchema } from "../ai/contract-analysis-schema";

export const CandidateSchema = z.strictObject({
  id: z.uuid(), title: z.string().min(1).max(240), action: z.string().min(1).max(500),
  category: ObligationCategorySchema, evidenceRequired: z.array(z.string().min(1).max(300)).max(20),
});
export const EvidenceRequestSchema = z.strictObject({
  evidence: AnalyzeContractRequestSchema,
  obligations: z.array(CandidateSchema).min(1).max(8),
}).refine(input => new Set(input.obligations.map(o => o.id)).size === input.obligations.length, "Duplicate candidate IDs");
export const MatchSchema = z.strictObject({
  obligationId: z.uuid(), match: z.enum(["strong", "possible", "weak", "none"]),
  explanation: z.string().min(1).max(1000),
  pageNumber: z.number().int().min(1).max(100), supportingEvidenceQuote: z.string().min(1).max(1200),
  needsHumanReview: z.boolean(), reviewReason: z.string().max(600).nullable(),
  validityText: z.string().max(300).nullable(),
});
export const EvidenceModelSchema = z.strictObject({ matches: z.array(MatchSchema).max(8) });
export const VerifiedMatchSchema = MatchSchema.extend({
  quoteVerified: z.boolean(), validityVerified: z.boolean(), reviewReason: z.string().max(1600).nullable(),
});
export const EvidenceResultSchema = z.strictObject({ matches: z.array(VerifiedMatchSchema).max(8) });
export type EvidenceRequest = z.infer<typeof EvidenceRequestSchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type VerifiedMatch = z.infer<typeof VerifiedMatchSchema>;
