export class AnalysisUnavailableError extends Error {
  constructor() {
    super("AI analysis is not configured on this server.");
    this.name = "AnalysisUnavailableError";
  }
}
