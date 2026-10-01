# ClauseOps AI - Phase 2A

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
5. Real results appear on the same page. They never redirect to the fictional grant demo and do not update fictional dashboard totals. Refreshing or leaving clears in-memory results.

## Architecture

- `lib/pdf/`: existing local extraction and PDF types
- `lib/ai/contract-analysis-schema.ts`: strict request, model output, and verified-result schemas/types
- `lib/ai/openai.ts`: server-only environment boundary
- `lib/ai/model.ts`: configured Responses API call, prompt safeguards, timeout, mockable SDK transport
- `lib/ai/handler.ts`: bounded streaming request reader, validation, sanitized HTTP errors
- `lib/ai/verify-sources.ts`: deterministic page quote matching and locally generated obligation IDs
- `app/api/analyze-contract/route.ts`: Node.js route adapter
- `components/file-picker.tsx`: extraction, explicit submission, loading/error states, cancellation and stale-result protection
- `components/analysis-result.tsx`: session-only source / interpretation / review display
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
- `node scripts/verify-ui.mjs`: application regression and responsive checks
- `node scripts/verify-analysis-ui.mjs`: real PDF extraction plus mocked API success/error/loading/empty/citation states

Browser scripts use Node's WebSocket with a dedicated headless Chromium debugging endpoint on localhost:9222. Start the app on localhost:3000, or set CLAUSEOPS_TEST_ORIGIN to a different local port. Screenshots and synthetic fixtures/results are written to gitignored `.qa/`. No real documents or API credentials are used in these automated checks.

Official SDK reference: https://developers.openai.com/api/docs/guides/structured-outputs

## Deliberate limitations

No database, authentication, Featherless, multi-model review, Chainlink CRE, blockchain, evidence backend, OCR, billing, notifications, or sync. The assistant, calendar, reports, evidence vault, and demo contracts remain fictional Phase 1 features. Evidence review labels are not independent verification. No analysis is persisted or automatically assigned as a compliance workflow.

ClauseOps assists with obligation tracking and compliance operations. It does not provide legal advice.
