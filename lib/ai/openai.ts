import "server-only";

import {
  createModelAnalyzer,
  readConfiguration,
} from "./model";

import type {
  AnalyzeContractRequest,
} from "./contract-analysis-schema";

// This is the only analysis module that reads environment credentials.
export async function analyzeContractWithOpenAI(
  input: AnalyzeContractRequest,
  signal?: AbortSignal,
) {
  const configuration =
    readConfiguration({
      OPENAI_API_KEY:
        process.env.OPENAI_API_KEY,
      OPENAI_MODEL:
        process.env.OPENAI_MODEL,
    });

  return createModelAnalyzer(
    configuration,
  )(input, signal);
}