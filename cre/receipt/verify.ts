import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { verifyReceipt } from "../../lib/receipts/core";

// Pure JS SHA-256 for CRE WASM: identical protocol, no Node/WebCrypto dependency.
export const workflowDigest = (text: string) => bytesToHex(sha256(new TextEncoder().encode(text)));
export const verifyWorkflowReceipt = (input: unknown) => verifyReceipt(input, workflowDigest);
