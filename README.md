# ClauseOps AI - Phase 1

From legal obligations to executable compliance.

A responsive LegalTech / RegTech frontend for the BLI Legal Tech Hackathon 2. Built with the existing Next.js App Router, React, TypeScript, Tailwind CSS, and ESLint; no runtime dependencies were added.

## Development

Run `npm install`, then `npm run dev`. Open http://localhost:3000.
Run `npm run lint` and `npm run build` for production checks, then `npm start` to serve the production build. On Windows PowerShell with restricted script execution, use `npm.cmd`.

## Pages

Landing, dashboard, contracts list and details, upload preview, obligations list and details, calendar agenda, evidence vault, scripted assistant, reports, and read-only settings. All sample contract and obligation links have corresponding detail pages. Unknown record IDs return 404.

## Structure

- `app/(workspace)`: shared application layout and route pages
- `components`: navigation, badges, cards, tables, feature views, and local interactions
- `types/index.ts`: domain types
- `mock-data/index.ts`: central fictional records, derived metrics, scripted assistant answers
- `lib/format.ts`: timezone-stable date formatting
- `app/globals.css`: design tokens, Tailwind import, component styles, responsive rules

## Demo boundaries

Source, AI interpretation, compliance state, and verification remain distinct. The fixed snapshot is 20 September 2026. All organisations, people, source excerpts, and records are fictional. Owners and confidence are illustrative. Obligation #7 has an internal review target because its source does not establish a contractual deadline.

Readiness = completed obligations / total obligations. Pending includes all unfinished obligations except overdue. Evidence readiness = obligations with reviewed demo evidence / total obligations. Reviewed describes a sample human review, not independent verification.

File selection only checks extension and size and displays filename and size. No contents are read, uploaded, analysed, or persisted. Fictional evidence records have no downloadable files. The assistant uses prepared answers and a clear fallback for unsupported questions.

No authentication, database, backend integration, document processing, AI provider, PDF export, or Chainlink CRE integration is connected. No secrets or environment variables are needed.

ClauseOps assists with obligation tracking and compliance operations. It does not provide legal advice.

## Browser verification

`scripts/verify-ui.mjs` uses Node's built-in WebSocket and Chrome DevTools Protocol. Start the production application on port 3000 and headless Chromium on debugging port 9222 with a dedicated local profile, then run `node scripts/verify-ui.mjs`. Screenshots and results are saved in ignored `.qa/`.

Checks cover routes, responsive overflow, local table scrolling, mobile navigation, search, filters, tabs, scripted chat, and preview feedback. This is supplementary browser verification, not a full accessibility audit.
