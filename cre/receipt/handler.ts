
import { type HTTPPayload, type Runtime } from "@chainlink/cre-sdk";
import { verifyWorkflowReceipt } from "./verify";

type Config = Record<string, never>;

export async function onReceipt(
  _runtime: Runtime<Config>,
  payload: HTTPPayload
) {
  // Bound parsing, return sanitized failures, and never log the supplied payload.
  if (payload.input.length > 1_000_000) {
    return JSON.stringify({
      valid: false,
      scope: "payload-integrity-only",
      errors: ["Receipt payload too large"],
      receiptId: null
    });
  }

  let input: unknown;

  try {
    input = JSON.parse(new TextDecoder().decode(payload.input));
  } catch {
    return JSON.stringify({
      valid: false,
      scope: "payload-integrity-only",
      errors: ["Invalid JSON"],
      receiptId: null
    });
  }

  return JSON.stringify(await verifyWorkflowReceipt(input));
}
