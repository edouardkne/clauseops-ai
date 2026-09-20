export type ComplianceStatus = "Pending" | "Due Soon" | "Completed" | "Missing Evidence" | "Overdue" | "Needs Review";
export type ConfidenceLevel = "High" | "Medium" | "Low";
export interface Contract {
  id: string;
  name: string;
  type: string;
  organization: string;
  uploadDate: string;
  status: "Active" | "Needs Review";
  pages: number;
  size: string;
  description: string;
}
export interface Obligation {
  id: string;
  title: string;
  description: string;
  contractId: string;
  category: string;
  owner: string;
  deadline: string;
  frequency: string;
  evidenceRequired: string[];
  status: ComplianceStatus;
  confidence: ConfidenceLevel;
  source: {
    section: string;
    page: number;
    quote: string;
  };
}
export interface Evidence {
  id: string;
  name: string;
  obligationId: string;
  type: string;
  uploadedDate: string;
  verificationStatus: "Reviewed" | "Awaiting Review" | "Needs Replacement";
}
export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  kind: "evidence" | "review" | "contract";
}
export interface ComplianceSummary {
  activeContracts: number;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  readiness: number;
  evidenceReadiness: number;
  reviewedEvidence: number;
}
