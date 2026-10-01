import { z } from "zod/v4";

export const AI_ANALYSIS_LIMITS = {
  maxPages: 100,
  maxCharacters: 250_000,
  maxPageCharacters: 50_000,
  maxRequestBytes: 1_500_000,
  timeoutMs: 120_000,
} as const;

export const ContractPageSchema = z.strictObject({
  pageNumber: z.number().int().min(1).max(AI_ANALYSIS_LIMITS.maxPages),
  // Blank pages are preserved, so citations retain the original PDF numbering.
  text: z.string().max(AI_ANALYSIS_LIMITS.maxPageCharacters),
});

export const AnalyzeContractRequestSchema = z.strictObject({
  filename: z.string().trim().min(1).max(240),
  pages: z.array(ContractPageSchema).min(1).max(AI_ANALYSIS_LIMITS.maxPages),
}).superRefine((input, context) => {
  const numbers = input.pages.map(page => page.pageNumber);
  if (new Set(numbers).size !== numbers.length) {
    context.addIssue({ code: "custom", message: "Page numbers must be unique." });
  }
  if (!input.pages.some(page => page.text.trim().length > 0)) {
    context.addIssue({ code: "custom", message: "Readable page text is required." });
  }
  if (input.pages.reduce((sum, page) => sum + page.text.length, 0) > AI_ANALYSIS_LIMITS.maxCharacters) {
    context.addIssue({ code: "custom", message: "Extracted text exceeds the character limit." });
  }
});

export const ObligationCategorySchema = z.enum([
  "financial", "reporting", "procurement", "data_protection", "insurance",
  "service_delivery", "governance", "confidentiality", "termination", "payment", "other",
]);
export const ConfidenceLevelSchema = z.enum(["direct", "inferred", "uncertain"]);

export const ModelObligationSchema = z.strictObject({
  title: z.string().min(1).max(240),
  description: z.string().min(1).max(1_500),
  action: z.string().min(1).max(500),
  responsibleParty: z.string().max(240).nullable(),
  category: ObligationCategorySchema,
  deadlineText: z.string().max(300).nullable(),
  recurrence: z.string().max(200).nullable(),
  evidenceRequired: z.array(z.string().min(1).max(300)).max(20),
  source: z.strictObject({
    pageNumber: z.number().int().min(1).max(100),
    quote: z.string().min(1).max(1_200),
  }),
  confidence: ConfidenceLevelSchema,
  needsHumanReview: z.boolean(),
  reviewReason: z.string().max(600).nullable(),
});

export const ContractAnalysisSchema = z.strictObject({
  documentTitle: z.string().min(1).max(240),
  documentType: z.string().min(1).max(120),
  language: z.string().min(1).max(80),
  summary: z.string().min(1).max(1_500),
  parties: z.array(z.string().min(1).max(200)).max(20),
  obligations: z.array(ModelObligationSchema).max(120),
  warnings: z.array(z.string().min(1).max(500)).max(30),
});

export const VerifiedObligationSchema = ModelObligationSchema.extend({
  id: z.uuid(),
  sourceVerified: z.boolean(),
  reviewReason: z.string().max(1_200).nullable(),
});
export const VerifiedContractAnalysisSchema = ContractAnalysisSchema.extend({
  obligations: z.array(VerifiedObligationSchema).max(120),
});
export type AnalyzeContractRequest = z.infer<typeof AnalyzeContractRequestSchema>;
export type ContractAnalysis = z.infer<typeof ContractAnalysisSchema>;
export type VerifiedObligation = z.infer<typeof VerifiedObligationSchema>;
export type VerifiedContractAnalysis = z.infer<typeof VerifiedContractAnalysisSchema>;
