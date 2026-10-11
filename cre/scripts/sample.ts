import { sealReceipt } from "../../lib/receipts/core";
import { workflowDigest } from "../receipt/verify";

// Synthetic metadata only. Regeneration is byte-for-byte deterministic.
const receipt = await sealReceipt({
  receiptVersion: "1", createdAt: "2026-10-10T10:00:00.000Z", statusAsOf: "2026-10-10",
  documentFingerprint: workflowDigest("synthetic document"), analysisFingerprint: workflowDigest("synthetic analysis"),
  obligations: [{ id: workflowDigest("synthetic obligation"), status: "Pending", reviewRequired: false, completionRecorded: false, sourceVerified: true, confidence: "direct" }],
  evidence: [], reviewedObligations: [], acceptedEvidenceLinks: [], unresolvedReviewCount: 0,
  operationalStateSummary: { Pending: 1, "Due Soon": 0, Overdue: 0, "Missing Evidence": 0, "Needs Review": 0, Completed: 0 },
}, workflowDigest);
await Bun.write(new URL("../receipt/sample.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
