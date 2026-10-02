import "server-only";
import { readConfiguration } from "../ai/model";
import { createEvidenceMatcher } from "./model";
import type { EvidenceRequest } from "./schema";

export async function matchEvidenceWithOpenAI(input: EvidenceRequest, signal?: AbortSignal) {
  return createEvidenceMatcher(readConfiguration({ OPENAI_API_KEY: process.env.OPENAI_API_KEY, OPENAI_MODEL: process.env.OPENAI_MODEL }))(input, signal);
}
