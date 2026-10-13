import { expect, test } from "bun:test";
import { verifyWorkflowReceipt, workflowDigest } from "../receipt/verify";
import { onReceipt } from "../receipt/handler";import type { HTTPPayload, Runtime } from "@chainlink/cre-sdk";

const sample = await Bun.file(new URL("../receipt/sample.json", import.meta.url)).json();
test("CRE digest matches standard SHA-256 known-answer vectors", () => {
  expect(workflowDigest("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  expect(workflowDigest("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
test("synthetic receipt passes the shared CRE verifier", async () => {
  expect((await verifyWorkflowReceipt(sample)).valid).toBe(true);
});
test("CRE verifier rejects tampering and extra raw content", async () => {
  expect((await verifyWorkflowReceipt({ ...sample, unresolvedReviewCount: 99 })).valid).toBe(false);
  expect((await verifyWorkflowReceipt({ ...sample, rawText: "forbidden" })).valid).toBe(false);
});
test("HTTP handler returns JSON result, bounds bytes and sanitizes malformed input", async () => {
  const runtime = {} as Runtime<Record<string, never>>;
  const payload = (text: string) => ({ input: new TextEncoder().encode(text) }) as HTTPPayload;
  expect(JSON.parse(await onReceipt(runtime, payload(JSON.stringify(sample)))).valid).toBe(true);
  expect(JSON.parse(await onReceipt(runtime, payload("{"))).errors).toEqual(["Invalid JSON"]);
  expect(JSON.parse(await onReceipt(runtime, payload("x".repeat(1_000_001)))).errors).toEqual(["Receipt payload too large"]);
});
