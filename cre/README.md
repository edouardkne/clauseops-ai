# ClauseOps receipt integrity foundation

This isolated TypeScript CRE workflow validates supplied receipt integrity, not legal compliance, document authenticity, reviewer identity, or the truth of AI interpretations. No workflow is deployed. The app only creates local previews and sends nothing to CRE.

## Tooling

Validated against official CLI **v1.38.0**, TypeScript SDK **1.23.0**, and Bun **1.4.3**. `bun.lock` pins dependencies separately from Next.js. The shared receipt protocol imports Zod from the root application, so install root dependencies first (`npm ci`).

The CLI was downloaded from the [official release](https://github.com/smartcontractkit/cre-cli/releases/tag/v1.38.0) using the documented [Windows manual installation](https://docs.chain.link/cre/getting-started/cli-installation/windows). ZIP SHA-256: `0e2dad018c94ec263079b47181637f029d06e92d981a134dbdfc58420572cc77`. Local executables live in ignored `.tools/`, not system PATH. Bun was downloaded from its official GitHub release and checksum-verified too.

From this `cre/` directory, with Bun and CRE available in your terminal:

```powershell
bun install --frozen-lockfile --ignore-scripts
bun run sample
bun run typecheck
bun test
cre login
cre workflow simulate ./receipt --target staging-settings --non-interactive --trigger-index 0 --http-payload ./receipt/sample.json
cre account access
```

For the project-local executables, use `../.tools/bun/bun-windows-x64/bun.exe` and `../.tools/cre/cre_v1.38.0_windows_amd64.exe` respectively. Add the Bun directory to the current terminal PATH for child compiler processes. `cre login` is interactive; no credentials belong in this repository. Deployment access is separate from login and must be checked, not assumed. Do not deploy or add `--broadcast` as part of this foundation.

The SDK's `cre-setup` / WASM compilation installs Javy into the user's home cache. Automatic postinstall is intentionally omitted to keep this task's writes inside the project. Before first simulation, the user can run `bun x cre-setup` as documented by Chainlink. Account login and any user-home tool setup are explicit remaining environment steps. Do not redirect OpenAI environment files into the CRE project.

## Architecture and protocol

`receipt/main.ts` registers an HTTP trigger with an empty simulation-only authorization config, bounds input to 1 MB, parses JSON, and returns a JSON-encoded verification result. **The trigger config is not production authorization.** Before any deployment, configure authorized callers using the official HTTP-trigger guide.

`receipt/verify.ts` adapts standard SHA-256 from `@noble/hashes` to the same verifier used locally in the app (`../lib/receipts/core.ts`). It uses no AI, secrets, external APIs, blockchain writes, or payload logging. The sample contains only synthetic metadata; regenerate it with `bun run sample`.

The shared strict version-1 schema rejects unknown fields. It checks identifier/hash formats, timestamp/date formats, bounded snapshots, unique IDs, known obligation targets, review and completion consistency, accepted evidence grounding/review metadata, summary counts, snapshot hashes, and the canonical receipt identifier. Results have `valid`, `scope: "payload-integrity-only"`, sanitized `errors`, and `receiptId`.

Canonicalization sorts object keys and encodes finite JSON values. Snapshot sets are sorted by opaque IDs before hashing; proposal and accepted-link order is normalized. This is an explicitly versioned JSON protocol, not a claim of full RFC 8785/JCS support. Array ordering inside an AI interpretation remains significant. The same logical snapshot **with the same supplied creation time and evaluation date** yields the same receipt. Changing those times intentionally changes identity.

The obligation/evidence snapshot hashes cover their normalized metadata. The payload hash excludes itself and `receiptId`; ID is `clauseops-v1-` plus that hash. Analysis content and evidence interpretations are hashed locally, with only digests exported. Fingerprints identify extracted text and filename, not PDF binary authenticity. Existing IDs are hashed before inclusion. No full text, quotes, parties, filenames, PDFs, or provider keys are serialized into receipts.

`reviewedObligations` is empty in v1 because ClauseOps has no obligation-approval action. Task completion and lack of ambiguity do not count as approval. Explicit evidence review remains separate proposal metadata. Unresolved reviews count distinct obligations, not individual reasons.

## Limits

A self-consistent receipt can be fabricated and rehashed by its sender. Hash validation is not a signature, identity attestation, timestamp authority, or proof that documents were actually processed. CRE cannot reproduce original text checks from hashes alone. Trusted submission, authenticated provenance, DON-signed output, and submission/result handling are future work. Hashes are not encryption and may remain linkable.

The preview is session-only and becomes stale when session state or evaluation date changes. There is no persistence, live CRE submission, blockchain receipt, or independent attestation in this phase.

Official references: [HTTP trigger](https://docs.chain.link/cre/guides/workflow/using-triggers/http-trigger/configuration), [simulation](https://docs.chain.link/cre/guides/operations/simulating-workflows), [account access](https://docs.chain.link/cre/reference/cli/account), [TypeScript runtime](https://docs.chain.link/cre/concepts/typescript-wasm-runtime).

## Verification run

`cre whoami`, the official `cre workflow simulate ./receipt --target staging-settings --non-interactive --trigger-index 0 --http-payload ./receipt/sample.json`, and `cre account access --non-interactive` report **not logged in / no credentials found**. Simulation and deployment-access inspection stop at authentication. No successful simulation or deployment access is claimed. Next user action: `cre login`, then repeat the simulation and access check above. No account was created or accessed automatically.
