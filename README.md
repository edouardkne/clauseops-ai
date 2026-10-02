# ClauseOps AI - Phase 2C

From legal obligations to executable compliance.

Phase 1's existing Next.js / React / TypeScript / Tailwind workspace is preserved. Phase 2A adds local PDF text extraction with unpdf and real server-side OpenAI analysis with Zod Structured Outputs.

## Run and configure

Run `npm install`, `npm run dev`, and open http://localhost:3000. For production use `npm run build` and `npm start`. Windows PowerShell may require `npm.cmd`.

Configure `OPENAI_API_KEY` and `OPENAI_MODEL` only in your local, gitignored `.env.local` or deployment secret manager. Both are required; there is no model fallback. Never use a NEXT_PUBLIC variable for credentials. No secret values are needed in source control.

## Real analysis flow

1. Select a text-based PDF on `/contracts/upload` (10 MB / 100 pages maximum).
2. unpdf extracts page-level text in browser memory. Empty pages keep their original numbering. Scanned/image-only, unreadable, or oversized PDFs are rejected; no OCR runs.
3. Inspect the extraction preview. Only clicking **Analyze with AI** sends filename plus page numbers and text to `POST /api/analyze-contract`. Raw PDF bytes are never transmitted by the analysis flow.
4. The server validates the request, invokes the official OpenAI SDK `responses.parse` with `zodTextFormat`, then validates model output and verifies each quote independently.
5. Real results appear on the same page. They never redirect to the fictional grant demo and do not update fictional dashboard totals. Results survive workspace navigation in memory. Refreshing or explicitly clearing the session removes them.

## Architecture

- `lib/pdf/`: existing local extraction and PDF types
- `lib/ai/contract-analysis-schema.ts`: strict request, model output, and verified-result schemas/types
- `lib/ai/openai.ts`: server-only environment boundary
- `lib/ai/model.ts`: configured Responses API call, prompt safeguards, timeout, mockable SDK transport
- `lib/ai/handler.ts`: bounded streaming request reader, validation, sanitized HTTP errors
- `lib/ai/verify-sources.ts`: deterministic page quote matching and locally generated obligation IDs
- `app/api/analyze-contract/route.ts`: Node.js route adapter
- `components/file-picker.tsx`: extraction, explicit submission, loading/error states, cancellation and stale-result protection
- `components/analysis-result.tsx`: separate source, interpretation, operational state, and review display
- `types/index.ts` and `mock-data/index.ts`: unchanged fictional workspace domain and demo records

## Citation checks and review

Each supporting quote is compared to the specifically cited supplied page after Unicode NFKC and whitespace normalisation. Case, punctuation, wording, and page boundaries are not repaired. An absent page or nonmatching quote is marked unverified, Uncertain, and Needs Review, with the reason appended. Model output cannot supply trusted IDs or sourceVerified fields. IDs are generated after validation.

A match establishes only that text exists on the extracted page. It does not establish accurate interpretation, legal compliance, document authenticity, or evidence verification. Inferred/uncertain interpretations and unspecified responsibility always require review. No numerical confidence scores are used.

## Security and limits

The route accepts only JSON with a filename and uniquely numbered pages. Limits: 100 pages, 50,000 characters per page, 250,000 total characters, and 1,500,000 actual request bytes. Streaming stops at the byte limit even if Content-Length is absent or dishonest. All analysis responses have Cache-Control: no-store. Browser cross-origin submissions are rejected, but this is not authentication.

Documents are explicitly treated as untrusted data in the model instructions. No tools are enabled. The prompt forbids following document commands, disclosing system instructions, inventing source facts, or making legal-compliance determinations. These controls reduce risk but do not make AI interpretation infallible.

The key remains server-side. Provider errors, stack traces, document text, and credentials are not logged or returned. Requests use store:false, no automatic retries, a two-minute SDK timeout, and a bounded output budget. OpenAI data-handling policies still apply; store:false is not a zero-retention guarantee. ClauseOps has no database persistence, document analytics, or browser storage of extracted content.

This unauthenticated prototype is for a controlled local/hackathon environment; public multi-tenant deployment needs access controls and usage quotas in a future phase.

## Verification

- `npm test`: existing TypeScript compiler plus Node's built-in test runner; no new testing framework. OpenAI transport is mocked, never paid API calls.
- `npm run lint`
- `npm run build`
- `node scripts/verify-ui.mjs`: historical Phase 1 audit (not the Phase 2B acceptance suite)
- `node scripts/verify-analysis-ui.mjs`: targeted Phase 2B PDF extraction, cached analysis, local assistant, completion, empty and responsive states using mocked analysis responses

Browser scripts use Node's WebSocket with a dedicated headless Chromium debugging endpoint on localhost:9222. Start the app on localhost:3000, or set CLAUSEOPS_TEST_ORIGIN to a different local port. Screenshots and synthetic fixtures/results are written to gitignored `.qa/`. No real documents or API credentials are used in these automated checks.

Official SDK reference: https://developers.openai.com/api/docs/guides/structured-outputs

## Deliberate limitations

No database, authentication, Featherless, multi-model review, Chainlink CRE, blockchain, evidence backend, OCR, billing, notifications, or sync. Calendar, reports, and demo contracts remain fictional Phase 1 features. Evidence Vault shows session evidence when a real contract is active; otherwise its historical demo is explicitly separate. The assistant uses only the current real analysis; it has no demo fallback. Evidence review labels are not independent verification. No analysis is persisted or automatically assigned as a compliance workflow.

ClauseOps assists with obligation tracking and compliance operations. It does not provide legal advice.

## Phase 2B local intelligence

`components/analysis-session.tsx` owns the workspace memory session. `lib/intelligence/types.ts`, `engine.ts`, `graph.ts`, `queries.ts`, and `analysis-cache.ts` define the operational model, deterministic counts/status/review rules, explicit source relationships, thirteen English question patterns, and analysis reuse. No provider request runs during rendering, navigation, filtering, completion changes, or assistant lookups.

The graph links documents, obligations, named parties, original deadline wording, required evidence, and claimed source pages/quotes. It does not infer dependencies between obligations. Eleven counters and the human review queue are recalculated from verified results without changing the source analysis.

Only valid standalone ISO calendar dates without recurrence are normalised. Relative dates, ambiguous formats, and recurrence remain original text and require review. Dates use an explicit UTC reference day, refreshed locally by the user. Status precedence is Needs Review, Missing Evidence when explicitly required evidence has no accepted association, explicit Completed, Overdue, Due Soon within seven days, then Pending. Completion is a reversible session action, never a model inference. Accepted evidence links are associations only and do not verify authenticity or legal sufficiency.

The SHA-256 cache identity includes filename, page numbers, and exact extracted text. It coalesces concurrent requests and reuses successful analyses within this workspace session; failures are evicted. Changing any of those inputs triggers a new analysis only on explicit submission. Clearing the session removes cached results and local completion state. Nothing is written to localStorage, sessionStorage, or a database.

The assistant answers thirteen deterministic question types using current obligations and citations. Unsupported synthesis is explicitly unavailable, with zero model calls. Missing deadlines or owners remain missing; unverified source quotes stay visibly unverified. Session state is not a legal compliance determination or a persistent tracking system.

## Phase 2C evidence intelligence

Evidence PDFs reuse local unpdf extraction (10 MB / 100 pages, no OCR). Session records contain IDs, metadata, timestamp, exact extracted pages and local/AI proposals. Each proposal retains its strength, explanation, supporting page/quote, deterministic quote and validity-wording checks, review flag/reason, user decision and review acknowledgement. Accepted and rejected links derive from these decisions. No binary or evidence data is persisted.

`lib/evidence/logic.ts` shortlists up to eight candidates using explicit IDs, filename/context tokens, category clues and evidence requirements. Literal IDs or complete multi-word requirements can produce local proposals without a provider call. Keyword matching is intentionally limited: users can select other candidates when the shortlist misses a semantic relationship. Local scores are internal ranking signals, not displayed confidence percentages.

Only **Match Evidence with AI** posts evidence filename/pages plus selected obligation IDs, titles, actions, categories and evidence requirements to `/api/match-evidence`. It never sends the full contract or raw PDF. The server uses the existing configured model and strict Responses/Zod outputs. Request validation reuses Phase 2A byte/text/page bounds, rejects extra fields and cross-origin browser requests, and returns sanitized no-store responses. No credentials are read in client code. The existing SDK dependencies are unchanged.

Every AI target ID must belong to the candidate set, with no duplicates. Evidence quotes are matched against the claimed page using the existing NFKC/whitespace normalisation; failed quotes downgrade to weak, require review and cannot be accepted. Explicit validity/expiry wording is checked against that same page and never converted into a validity verdict. Model flags cannot override these checks. Prompts treat all evidence and obligation fields as untrusted source data.

**Accept Match** creates a session association only. **Reject Match** removes that association and preserves the rejection across retries, cache reuse and reselection. **Review Match** exposes grounding/reasons; **Confirm relevance reviewed** explicitly acknowledges ambiguity without clearing independent contract review flags. Ungrounded matches cannot be accepted or marked reviewed. Unresolved uncertain matches trigger Needs Review, including after acceptance. Completion remains a separate user action.

The provider owns a memory-only promise cache scoped by active contract and a SHA-256 fingerprint of exact evidence pages/filename and candidate content. Identical pending/completed requests are reused; failures are retryable. Changing the selected candidate set is a different explicitly submitted request. Clearing the analysis session removes evidence, decisions and caches. Navigation preserves session records; refresh removes them.

The local assistant adds six evidence query patterns to the existing evidence-requirement query: accepted links, missing evidence, links by obligation, review queue, rejected AI proposals and unlinked evidence. All seven use structured session state with zero provider calls. Generative assistant synthesis remains disabled.

Run `node scripts/verify-evidence-ui.mjs` against the built app and a dedicated headless Chromium debugging endpoint for the targeted Phase 2C suite. APIs are intercepted with synthetic fixtures, so browser tests also spend no credits. This phase does not introduce database persistence, evidence authenticity checks, receipts, blockchain, OCR or deployment.
