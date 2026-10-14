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
cre whoami
```

For the project-local executables, use `../.tools/bun/bun-windows-x64/bun.exe` and `../.tools/cre/cre_v1.38.0_windows_amd64.exe` respectively. Add the Bun directory to the current terminal PATH for child compiler processes. `cre login` is interactive; no credentials belong in this repository. Deployment access is separate from login and must be checked, not assumed. Do not deploy or add `--broadcast` as part of this foundation.

The SDK's `cre-setup` / WASM compilation installs Javy into the user's home cache. Automatic postinstall is intentionally omitted to keep this task's writes inside the project. Before first simulation, the user can run `bun x cre-setup` as documented by Chainlink. Account login and any user-home tool setup are explicit remaining environment steps. Do not redirect OpenAI environment files into the CRE project.

## Architecture and protocol

`receipt/main.ts` registers an HTTP trigger with an empty simulation-only authorization config, bounds input to 1 MB, parses JSON, and returns a JSON-encoded verification result. When an EVM caller address is supplied in the workflow config, the trigger configures the SDK's `KEY_TYPE_ECDSA_EVM` authorized key. `receipt/config.json` remains empty for simulation. The separate `receipt/deployment.config.template.json` is not referenced by the workflow and contains only an invalid placeholder; it is not deployable configuration. There is no app-facing submission endpoint.

`receipt/verify.ts` adapts standard SHA-256 from `@noble/hashes` to the same verifier used locally in the app (`../lib/receipts/core.ts`). It uses no AI, secrets, external APIs, blockchain writes, or payload logging. The sample contains only synthetic metadata; regenerate it with `bun run sample`.

The shared strict version-1 schema rejects unknown fields. It checks identifier/hash formats, timestamp/date formats, bounded snapshots, unique IDs, known obligation targets, review and completion consistency, accepted evidence grounding/review metadata, summary counts, snapshot hashes, and the canonical receipt identifier. Results have `valid`, `scope: "payload-integrity-only"`, sanitized `errors`, and `receiptId`.

Canonicalization sorts object keys and encodes finite JSON values. Snapshot sets are sorted by opaque IDs before hashing; proposal and accepted-link order is normalized. This is an explicitly versioned JSON protocol, not a claim of full RFC 8785/JCS support. Array ordering inside an AI interpretation remains significant. The same logical snapshot **with the same supplied creation time and evaluation date** yields the same receipt. Changing those times intentionally changes identity.

The obligation/evidence snapshot hashes cover their normalized metadata. The payload hash excludes itself and `receiptId`; ID is `clauseops-v1-` plus that hash. Analysis content and evidence interpretations are hashed locally, with only digests exported. Fingerprints identify extracted text and filename, not PDF binary authenticity. Existing IDs are hashed before inclusion. No full text, quotes, parties, filenames, PDFs, or provider keys are serialized into receipts.

`reviewedObligations` is empty in v1 because ClauseOps has no obligation-approval action. Task completion and lack of ambiguity do not count as approval. Explicit evidence review remains separate proposal metadata. Unresolved reviews count distinct obligations, not individual reasons.

## Limits

A self-consistent receipt can be fabricated and rehashed by its sender. Hash validation is not a signature, identity attestation, timestamp authority, or proof that documents were actually processed. CRE cannot reproduce original text checks from hashes alone. Trusted submission, authenticated provenance, DON-signed output, and submission/result handling are future work. Hashes are not encryption and may remain linkable.

The preview is session-only and becomes stale when session state or evaluation date changes. The app distinguishes a local preview from local payload-integrity validation. CRE simulation is a development/test lifecycle state only; it is not a submitted receipt or DON result. Strict metadata schemas for future submission acknowledgements, workflow results, simulations, and attestation references validate shape only: they do not authenticate the sender or cryptographically verify an attestation. No production transition accepts those claims.

There is no persistence, live CRE submission, blockchain receipt, authenticated workflow result, or independent attestation in this phase. The browser-created receipt is not trusted provenance. A future server transport must remain server-only and requires authenticated provenance, authorization, durable/idempotent submission records, an approved deployed workflow and caller policy, and an official result/attestation verification mechanism. Those dependencies must be solved before submission or DON-verification states can be enabled.

Official references: [HTTP trigger](https://docs.chain.link/cre/guides/workflow/using-triggers/http-trigger/configuration), [simulation](https://docs.chain.link/cre/guides/operations/simulating-workflows), [account access](https://docs.chain.link/cre/reference/cli/account), [TypeScript runtime](https://docs.chain.link/cre/concepts/typescript-wasm-runtime).

## STEP 3B-2 deployment readiness (inactive)

### Selected deployment model

For a controlled hackathon demonstration, prefer the **private workflow registry** after explicit deploy-access approval. It avoids a linked wallet, mainnet registry transaction, and gas for workflow lifecycle operations. It is currently documented as beta and requires the organization to have private-registry access. A private registry is a workflow-management/control-plane choice; it does **not** make workflow execution confidential. The workflow still executes on its configured DON. The public/onchain registry is the alternative when a publicly recorded workflow owner and onchain lifecycle record are specifically required; it needs a linked EVM key, `CRE_ETH_PRIVATE_KEY`, an Ethereum Mainnet RPC, and mainnet ETH for registry transactions. That is unnecessary overhead for this demonstration.

No registry target has been added, and no deployment is enabled by this preparation. The installed CLI is **v1.38.0** and the pinned SDK is **1.23.0**. The installed SDK trigger types support `authorizedKeys` and `KEY_TYPE_ECDSA_EVM`; its `Report.parse()` API exists but requires a CRE `runtime`. The existing `staging-settings`, Sepolia RPC, empty `receipt/config.json`, workflow name, and simulation command remain intact. The simulation path still calls `trigger({})`; the deployment template is deliberately unreferenced and its placeholder fails address validation.

### Caller authorization and submission boundary

The HTTP-trigger docs require deployed triggers to have at least one `authorizedKeys` entry. This workflow uses the documented EVM-address form. Only public caller addresses belong in workflow config; private signing keys must remain in a backend secret manager and must never be included in this repository, client bundle, workflow config, or logs. The gateway endpoint depends on the workflow execution environment (public vs enterprise), not on private vs onchain registry. Obtain the real gateway URL from the CRE organization UI after deployment; do not infer or check in an endpoint.

CRE's documented gateway call is a JSON-RPC `workflows.execute` request authenticated by an ECDSA-signed JWT (`alg: ETH`) from an authorized key. The JWT binds the request using the SHA-256 digest (with `0x` prefix) of the UTF-8 JSON-RPC body with object keys sorted lexicographically at every level. Its EIP-191-prefixed message is signed with the caller's key. Claims include `iss`, `iat`, `exp`, `jti`, and `digest`; `exp` must be no more than five minutes after `iat`, and `jti` must be unique per request to limit replay. Do not hand-roll this cryptography in the app. Before any integration:

- Authenticate the application user server-side; authorize access to the specific contract/session and receipt owner before submission. The current app has no user authentication, tenant boundary, or persistent session state.
- Build submissions from server-owned session data. A browser-created receipt and its SHA-256 self-consistency are untrusted input, not authenticated provenance.
- Sign only on a server using a dedicated, least-privilege EVM key stored in a secret manager. Restrict authorized callers to the intended address(es); plan rotation and revocation.
- Enforce bounded JSON body size (the current CRE handler limit is 1 MB), content type, request timeouts, per-user and per-key quotas/rate limits, and sanitized error responses. Never log document contents, bearer tokens, signatures, or secret material.
- Persist a unique submission/idempotency record keyed to the authenticated owner and receipt before dispatch. Bind retries to that record, use fresh request IDs and JWT `jti`s, and make ambiguous gateway timeouts reconcilable without silently resubmitting as a new operation. Persist the gateway execution ID separately from verification status.

The gateway acknowledgement schema in `lib/receipts/lifecycle.ts` is intentionally **untrusted metadata only**. It validates the documented JSON-RPC `ACCEPTED` response, correlates request and workflow IDs, and rejects unexpected fields/statuses. It does not authenticate the gateway, advance lifecycle state, or claim workflow completion.

### Result and report trust boundary

The current workflow returns an ordinary JSON integrity result. A gateway response with `status: "ACCEPTED"` means only that the gateway accepted the execution request; it is not the handler result, a DON attestation, or proof that execution completed. Likewise, a `valid: true` JSON object—even one with a matching receipt ID—is not independently authenticated. A locally valid SHA-256 receipt is not a DON attestation, and the earlier local CRE simulation is not production verification.

The official offchain-verification guide defines a CRE report as `rawReport`, `reportContext`, and DON signatures. A receiver must verify those signatures against authorized DON signers in the Capability Registry before trusting the report body. Verification yields report metadata including the workflow ID and execution ID. SDK 1.23.0's `Report.parse(runtime, ...)` performs this verification inside a CRE workflow, not directly in a Next.js server route because it requires a CRE runtime. The official outside-CRE guide shows a viem-based implementation, but labels the example educational and unaudited; do not copy it into production or invent a substitute verifier.

Before claiming an independently verified result, the future protocol must produce and cryptographically verify a DON-signed report, then bind all of the following: (1) the receipt ID from the server-owned original submission record, (2) the expected deployed workflow ID, and (3) the execution ID correlated to the accepted gateway request. The signed report body must carry the exact receipt ID and result; the report's parsed workflow and execution metadata must match the stored expected identities. Only after the signature/quorum checks and those bindings pass may a future authenticated-result state be considered. A report-verification integration, server authentication, authorization, persistence, replay/idempotency controls, and a reviewed production key-management design are all outstanding.

### Inactive template and finish procedure

`receipt/deployment.config.template.json` shows only the configuration field required to authorize one EVM caller. It is deliberately not wired into `workflow.yaml`, and its placeholder is invalid. Keep it that way until access, an authentication design, and protected server-side key storage are ready. Do not put the caller's private key in this file.

After deployment access is explicitly approved, complete the remaining work as a separately authorized STEP 3 operation:

1. Confirm `Deploy Access: Enabled` with `cre whoami` and confirm `cre registry list` exposes the private registry. If either is false, stop; do not deploy. Do not resubmit an access request from this preparation.
2. Complete the application authentication/authorization and durable ownership/idempotency design first. Choose and review the signed-report verification path and provision server-side secret storage before permitting callers.
3. Create an ignored, local deployment config from the inactive template with the approved caller's **public EVM address**. Add a dedicated deployment target to `workflow.yaml` using `deployment-registry: "private"` and that config path. Do not replace the simulation target or its empty config.
4. Verify the configured gateway signing library against Chainlink's current JWT/digest specification; add tests with synthetic keys and bodies only. Do not commit credentials or enable a public submission route.
5. Run type checks, tests, compile, and the existing synthetic local simulation. Review the exact diff and target/config selection before any deployment.
6. Only after a separate, explicit deployment approval, run the private-registry deploy command for that target. The documented private-registry deploy flow registers the workflow **active immediately**; therefore, do this only after its caller allowlist and controlled backend boundary are ready. Do not use the onchain registry unless its wallet/gas requirements are intentionally accepted.
7. Record the real workflow ID from CLI/UI output and the gateway endpoint from the organization UI in protected deployment configuration, not source placeholders. Check the deployed workflow's authorized keys and environment.
8. Send one bounded synthetic receipt from the authenticated server, with a fresh request ID and JWT. Treat `ACCEPTED` only as an execution-queue acknowledgement; correlate and inspect the execution in the CRE UI.
9. Implement and verify the DON-signed report path. Check the report signature/quorum, receipt ID, workflow ID, and execution ID against the durable submission record. Exercise rejected signatures, mismatched identities/receipt IDs, duplicate requests, expired JWTs, replayed `jti`s, timeouts, and ownership violations using offline fixtures.
10. Keep UI wording at “Verification not yet submitted to Chainlink CRE” until a separately reviewed product change enables a truthful submission state. Do not expose a verified-by-Chainlink claim until the independent report verification and all identity bindings are in production and tested.

### Current blockers

- Hackathon deploy-access approval is unconfirmed. No deployment or activation has occurred.
- There is no deployed workflow ID, production gateway URL, authorized caller address, signing key, or official provider response.
- The app has no user authentication/authorization, persistent session/receipt ownership, or durable idempotent submission store.
- The current workflow emits plain JSON, not a DON-signed result report; there is no production report verifier or result-binding path.
- No public submission endpoint or live submission UI exists, and neither is added by this readiness change.

Official references: [Deploying workflows](https://docs.chain.link/cre/guides/operations/deploying-workflows), [private registry deployment](https://docs.chain.link/cre/guides/operations/deploying-to-private-registry-ts), [onchain registry deployment](https://docs.chain.link/cre/guides/operations/deploying-to-onchain-registry-ts), [HTTP trigger configuration](https://docs.chain.link/cre/guides/workflow/using-triggers/http-trigger/configuration-ts), [triggering deployed workflows](https://docs.chain.link/cre/guides/workflow/using-triggers/http-trigger/triggering-deployed-workflows), [offchain report verification](https://docs.chain.link/cre/guides/workflow/using-http-client/verifying-reports-offchain-ts).

## Verification run

On **October 14, 2026**, the official Chainlink CRE workflow **compiled successfully** and the local workflow **simulation completed successfully** with the synthetic receipt. The synthetic receipt result was `valid: true` with scope `payload-integrity-only`. This confirms local workflow execution and receipt payload-integrity checks only; it is not a deployment, production submission, DON attestation, legal-compliance result, or proof of receipt provenance.

A deployment access request was submitted under the Hackathon category, but approval has **not** been confirmed. No deployed workflow, production caller authorization, production CRE endpoint, authenticated CRE result, or independently verified DON attestation exists. The live application therefore continues to display “Verification not yet submitted to Chainlink CRE.”
