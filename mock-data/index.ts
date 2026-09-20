import type { ActivityItem, ComplianceSummary, Contract, Evidence, Obligation } from "@/types";
// Fixed snapshot: dates and statuses are illustrative, not a live compliance engine.
export const demoDate = "2026-09-20";
export const disclaimer = "ClauseOps assists with obligation tracking and compliance operations. It does not provide legal advice.";
export const contracts: Contract[] = [
  { id: "grant", name: "Grant_Agreement.pdf", type: "Grant agreement", organization: "Ubuntu Community Foundation", uploadDate: "2026-09-03", status: "Active", pages: 18, size: "1.8 MB", description: "Community skills programme · 2026–2027 funding cycle" },
  { id: "services", name: "Services_Agreement.pdf", type: "Service agreement", organization: "Northstar Digital", uploadDate: "2026-09-05", status: "Active", pages: 12, size: "940 KB", description: "Managed technology services · annual engagement" },
  { id: "data", name: "Data_Processing_Addendum.pdf", type: "Data processing", organization: "Acacia Analytics", uploadDate: "2026-09-08", status: "Needs Review", pages: 8, size: "620 KB", description: "Data handling responsibilities · supplier operations" },
  { id: "partner", name: "Partnership_Agreement.pdf", type: "Partnership", organization: "Open Path Initiative", uploadDate: "2026-09-10", status: "Active", pages: 14, size: "1.2 MB", description: "Regional programme delivery · partner collaboration" },
];
export const obligations: Obligation[] = [
  { id: "1", title: "Submit quarterly financial report", description: "Prepare and submit a financial report covering grant expenditure, budget variances, and supporting receipts for the third quarter.", contractId: "grant", category: "Financial reporting", owner: "Amara Okafor", deadline: "2026-09-30", frequency: "Quarterly", evidenceRequired: ["Signed quarterly financial report", "Submission acknowledgement"], status: "Pending", confidence: "High", source: { section: "4.2 — Financial reporting", page: 6, quote: "The Grantee shall submit a quarterly financial report, including a statement of expenditure and supporting receipts, no later than thirty (30) days after the end of each reporting quarter. For the third quarter, the reporting period closes on 31 August 2026." } },
  { id: "2", title: "Provide programme progress update", description: "Share programme milestones, participant outcomes, and delivery challenges with the funder.", contractId: "grant", category: "Programme reporting", owner: "Lebo Nkosi", deadline: "2026-09-24", frequency: "Monthly", evidenceRequired: ["Progress report"], status: "Due Soon", confidence: "High", source: { section: "4.3 — Programme updates", page: 7, quote: "A monthly programme progress update shall be delivered by the twenty-fourth day of each month." } },
  { id: "3", title: "Maintain grant expenditure records", description: "Retain an itemised ledger and supporting documentation for all grant-funded expenditure.", contractId: "grant", category: "Record keeping", owner: "Amara Okafor", deadline: "2026-09-15", frequency: "Monthly", evidenceRequired: ["Expenditure ledger"], status: "Completed", confidence: "High", source: { section: "5.1 — Record retention", page: 9, quote: "The Grantee shall retain an itemised expenditure ledger and supporting records, with the monthly ledger available by the fifteenth day." } },
  { id: "4", title: "Confirm public liability insurance", description: "Provide the current insurance certificate for programme delivery activities.", contractId: "grant", category: "Insurance", owner: "Lebo Nkosi", deadline: "2026-09-12", frequency: "Annually", evidenceRequired: ["Current insurance certificate"], status: "Overdue", confidence: "High", source: { section: "8.2 — Insurance", page: 13, quote: "Proof of current public liability insurance shall be provided by 12 September 2026." } },
  { id: "5", title: "Submit monthly service review", description: "Document service levels, incidents, and remediation actions for the reporting month.", contractId: "services", category: "Service delivery", owner: "Daniel Meyer", deadline: "2026-09-18", frequency: "Monthly", evidenceRequired: ["Service review minutes"], status: "Completed", confidence: "High", source: { section: "3.4 — Service reviews", page: 4, quote: "The Provider shall deliver the service review minutes by 18 September 2026." } },
  { id: "6", title: "Attach business continuity test results", description: "Attach the documented results of the latest business continuity exercise.", contractId: "services", category: "Business continuity", owner: "Daniel Meyer", deadline: "2026-09-28", frequency: "Annually", evidenceRequired: ["Continuity test report"], status: "Missing Evidence", confidence: "High", source: { section: "7.1 — Continuity", page: 9, quote: "The Provider shall provide documented business continuity test results by 28 September 2026." } },
  { id: "7", title: "Clarify incident notification window", description: "Confirm when the notification window begins and who receives the initial notice.", contractId: "data", category: "Data protection", owner: "Sofia Patel", deadline: "2026-09-25", frequency: "Event triggered", evidenceRequired: ["Approved notification procedure"], status: "Needs Review", confidence: "Low", source: { section: "6.2 — Incident notification", page: 5, quote: "The Processor shall notify the Controller promptly following confirmation of a material security incident." } },
  { id: "8", title: "Review authorised access register", description: "Review and approve the list of personnel with access to programme data.", contractId: "data", category: "Access control", owner: "Sofia Patel", deadline: "2026-09-16", frequency: "Quarterly", evidenceRequired: ["Approved access register"], status: "Completed", confidence: "High", source: { section: "3.2 — Access controls", page: 3, quote: "The authorised access register shall be reviewed and approved by 16 September 2026." } },
  { id: "9", title: "Confirm partner delivery milestones", description: "Agree and document milestone owners for the next programme cycle.", contractId: "partner", category: "Programme delivery", owner: "Lebo Nkosi", deadline: "2026-10-05", frequency: "Quarterly", evidenceRequired: ["Signed milestone schedule"], status: "Pending", confidence: "Medium", source: { section: "2.3 — Delivery schedule", page: 4, quote: "The parties shall agree the next delivery schedule by 5 October 2026." } },
  { id: "10", title: "Record partner onboarding approval", description: "Retain the approved onboarding checklist for the delivery partner.", contractId: "partner", category: "Governance", owner: "Amara Okafor", deadline: "2026-09-11", frequency: "Once", evidenceRequired: ["Approved onboarding checklist"], status: "Completed", confidence: "High", source: { section: "2.1 — Onboarding", page: 3, quote: "Partner onboarding approval shall be recorded by 11 September 2026." } },
];
export const evidence: Evidence[] = [
  { id: "e1", name: "August_Expenditure_Ledger.xlsx", obligationId: "3", type: "Spreadsheet", uploadedDate: "2026-09-14", verificationStatus: "Reviewed" },
  { id: "e2", name: "Service_Review_September.pdf", obligationId: "5", type: "Meeting record", uploadedDate: "2026-09-18", verificationStatus: "Reviewed" },
  { id: "e3", name: "Authorised_Access_Register.pdf", obligationId: "8", type: "Access register", uploadedDate: "2026-09-16", verificationStatus: "Reviewed" },
  { id: "e4", name: "Partner_Onboarding_Approval.pdf", obligationId: "10", type: "Approval", uploadedDate: "2026-09-11", verificationStatus: "Reviewed" },
  { id: "e5", name: "Programme_Update_Draft.docx", obligationId: "2", type: "Progress report", uploadedDate: "2026-09-19", verificationStatus: "Awaiting Review" },
  { id: "e6", name: "Insurance_Certificate_2025.pdf", obligationId: "4", type: "Certificate", uploadedDate: "2026-09-12", verificationStatus: "Needs Replacement" },
];
export const activity: ActivityItem[] = [
  { id: "a1", actor: "Lebo Nkosi", action: "added evidence to", target: "Provide programme progress update", time: "19 Sep · 14:32", kind: "evidence" },
  { id: "a2", actor: "Daniel Meyer", action: "completed", target: "Submit monthly service review", time: "18 Sep · 10:15", kind: "review" },
  { id: "a3", actor: "Sofia Patel", action: "flagged a clause for review in", target: "Data_Processing_Addendum.pdf", time: "17 Sep · 09:40", kind: "contract" },
];
const completed = obligations.filter(o => o.status === "Completed").length;
const overdue = obligations.filter(o => o.status === "Overdue").length;
const reviewedEvidence = new Set(evidence.filter(e => e.verificationStatus === "Reviewed").map(e => e.obligationId)).size;
export const summary: ComplianceSummary = {
  activeContracts: contracts.filter(c => c.status === "Active").length,
  total: obligations.length, completed, overdue, pending: obligations.length - completed - overdue,
  readiness: Math.round(completed / obligations.length * 100),
  evidenceReadiness: Math.round(reviewedEvidence / obligations.length * 100), reviewedEvidence,
};
export const assistantQuestions = ["What obligations are due this month?", "Why is obligation #7 marked Needs Review?", "What evidence is still missing?", "Show me the source clause."];
export const assistantAnswers = [
  "Five open obligations have September deadlines: the quarterly financial report (30 Sep), programme progress update (24 Sep), continuity test results (28 Sep), incident notification review (25 Sep), and insurance confirmation (12 Sep, overdue). This uses the fixed 20 September demo snapshot.",
  "Obligation #7 uses the term ‘promptly’ without a defined time window. Section 6.2, page 5, also leaves the trigger ‘confirmation’ open to interpretation. The 25 September date is an internal review target, not an extracted contractual deadline. A human reviewer should clarify the requirement.",
  "The financial report and submission acknowledgement, current insurance certificate, continuity test report, approved notification procedure, and signed milestone schedule are missing reviewed evidence. The programme update has a draft awaiting review.",
  obligations[0].source.quote,
];
