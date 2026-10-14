import { z } from "zod";
import { ReceiptSchema, verifyReceipt, type ComplianceReceipt, type Digest } from "./core";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const identifier = z.string().min(1).max(128).regex(/^[a-zA-Z0-9._:-]+$/);
const timestamp = z.string().datetime();

export const UntrustedCreVerificationResultSchema = z.strictObject({
  valid: z.boolean(),
  scope: z.literal("payload-integrity-only"),
  errors: z.array(z.string().min(1).max(160)).max(16),
  receiptId: z.string().regex(/^clauseops-v1-[a-f0-9]{64}$/).nullable(),
}).superRefine((result, context) => {
  if (result.valid !== (result.errors.length === 0) || (result.valid && result.receiptId === null)) {
    context.addIssue({ code: "custom", message: "Inconsistent verification result metadata" });
  }
});
export type UntrustedCreVerificationResult = z.infer<typeof UntrustedCreVerificationResultSchema>;

export const UntrustedSubmissionAcknowledgementSchema = z.strictObject({
  submissionId: identifier,
  receiptId: z.string().regex(/^clauseops-v1-[a-f0-9]{64}$/),
  status: z.enum(["accepted", "queued"]),
  acceptedAt: timestamp,
});

const gatewayWorkflowId = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

export const UntrustedCreGatewayAcknowledgementSchema = z.strictObject({
  jsonrpc: z.literal("2.0"),
  id: z.string().min(1).max(128),
  method: z.literal("workflows.execute"),
  result: z.strictObject({
    workflow_id: gatewayWorkflowId,
    workflow_execution_id: z.string().min(1).max(128),
    status: z.literal("ACCEPTED"),
  }),
});
export type UntrustedCreGatewayAcknowledgement = z.infer<typeof UntrustedCreGatewayAcknowledgementSchema>;

export function parseUntrustedCreGatewayAcknowledgement(
  input: unknown,
  expectedRequestId: string,
  expectedWorkflowId: string,
): UntrustedCreGatewayAcknowledgement | null {
  if (!/^[a-fA-F0-9]{64}$/.test(expectedWorkflowId)) return null;
  const parsed = UntrustedCreGatewayAcknowledgementSchema.safeParse(input);
  if (
    !parsed.success ||
    parsed.data.id !== expectedRequestId ||
    parsed.data.result.workflow_id.slice(2).toLowerCase() !== expectedWorkflowId.toLowerCase()
  ) return null;
  return parsed.data;
}

export const UntrustedAuthenticatedCreResultMetadataSchema = z.strictObject({
  receiptId: z.string().regex(/^clauseops-v1-[a-f0-9]{64}$/),
  workflowId: identifier,
  runId: identifier,
  receivedAt: timestamp,
  result: UntrustedCreVerificationResultSchema,
}).refine(metadata => metadata.receiptId === metadata.result.receiptId, "Result receipt ID mismatch");

export const UntrustedAttestationMetadataSchema = z.strictObject({
  receiptId: z.string().regex(/^clauseops-v1-[a-f0-9]{64}$/),
  workflowId: identifier,
  runId: identifier,
  attestationId: identifier,
  verifiedAt: timestamp,
});

export const UntrustedCreSimulationMetadataSchema = z.strictObject({
  mode: z.literal("simulation"),
  workflowName: identifier,
  completedAt: timestamp,
  result: UntrustedCreVerificationResultSchema,
});

export type VerificationState =
  | { status: "local-preview"; receiptId: ComplianceReceipt["receiptId"] }
  | { status: "local-integrity-valid"; receiptId: ComplianceReceipt["receiptId"]; scope: "payload-integrity-only"; validatedAt: string }
  | { status: "cre-simulation"; receiptId: ComplianceReceipt["receiptId"]; scope: "payload-integrity-only"; simulatedAt: string; workflowName: string }
  | { status: "receipt-submitted"; receiptId: ComplianceReceipt["receiptId"]; submissionId: string; submittedAt: string }
  | { status: "verification-pending"; receiptId: ComplianceReceipt["receiptId"]; submissionId: string; pendingSince: string }
  | { status: "authenticated-cre-result"; receiptId: ComplianceReceipt["receiptId"]; submissionId: string; workflowId: string; runId: string; result: UntrustedCreVerificationResult; receivedAt: string }
  | { status: "attestation-verified"; receiptId: ComplianceReceipt["receiptId"]; submissionId: string; workflowId: string; runId: string; attestationId: string; verifiedAt: string }
  | { status: "failed"; receiptId: ComplianceReceipt["receiptId"] | null; stage: "local-validation" | "cre-simulation" | "submission" | "verification" | "attestation"; errors: string[] }
  | { status: "unavailable"; receiptId: ComplianceReceipt["receiptId"] | null; integration: "cre"; reason: "deployment-not-approved" | "endpoint-not-configured" | "authentication-required" | "persistence-required" };

const LocalIntegrityCheckSchema = z.strictObject({
  type: z.literal("validate-local-integrity"),
  receipt: ReceiptSchema,
  checkedAt: timestamp,
});

export function createLocalReceiptPreview(input: unknown): VerificationState {
  const receipt = ReceiptSchema.parse(input);
  return { status: "local-preview", receiptId: receipt.receiptId };
}

export async function transitionVerificationState(
  current: VerificationState,
  event: unknown,
  digest: Digest,
): Promise<VerificationState> {
  const parsedEvent = LocalIntegrityCheckSchema.safeParse(event);
  if (!parsedEvent.success) throw new Error("Unsupported verification lifecycle transition");
  if (current.status !== "local-preview") throw new Error("Local integrity validation requires a receipt preview");
  if (parsedEvent.data.receipt.receiptId !== current.receiptId) throw new Error("Receipt ID does not match the active preview");

  const result = await verifyReceipt(parsedEvent.data.receipt, digest);
  if (!result.valid) {
    return { status: "failed", receiptId: current.receiptId, stage: "local-validation", errors: result.errors };
  }
  return {
    status: "local-integrity-valid",
    receiptId: current.receiptId,
    scope: result.scope,
    validatedAt: parsedEvent.data.checkedAt,
  };
}

export function parseUntrustedCreVerificationResult(
  input: unknown,
  expectedReceiptId: string,
): UntrustedCreVerificationResult | null {
  if (!hash.safeParse(expectedReceiptId.replace(/^clauseops-v1-/, "")).success) return null;
  const parsed = UntrustedCreVerificationResultSchema.safeParse(input);
  if (!parsed.success || parsed.data.receiptId !== expectedReceiptId) return null;
  return parsed.data;
}
