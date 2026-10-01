import type { AnalyzeContractRequest, VerifiedContractAnalysis } from "../ai/contract-analysis-schema";

export async function documentFingerprint(input: AnalyzeContractRequest): Promise<string> {
  // No whitespace normalization: any change to text or page number invalidates
  // the cache. Sorting removes incidental array order, not original page numbers.
  const canonical = JSON.stringify({ filename: input.filename, pages: [...input.pages].sort((a, b) => a.pageNumber - b.pageNumber).map(p => ({ pageNumber: p.pageNumber, text: p.text })) });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

// Owned by the workspace provider, never a module-global or persistent cache.
export class AnalysisCache {
  private entries = new Map<string, Promise<VerifiedContractAnalysis>>();

  run(key: string, analyze: () => Promise<VerifiedContractAnalysis>): Promise<VerifiedContractAnalysis> {
    const existing = this.entries.get(key);
    if (existing) return existing;
    const pending = Promise.resolve().then(analyze).catch(error => {
      if (this.entries.get(key) === pending) this.entries.delete(key);
      throw error;
    });
    this.entries.set(key, pending);
    return pending;
  }

  clear() { this.entries.clear(); }
}
