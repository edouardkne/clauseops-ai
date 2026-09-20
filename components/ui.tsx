import Link from "next/link";
import type { ReactNode } from "react";
import type { ConfidenceLevel, Contract, Evidence } from "@/types";
import { obligations } from "@/mock-data";
import { formatDate } from "@/lib/format";
import { Icon, type IconName } from "./icon";
export function Brand() {
  return <Link href="/" className="brand" aria-label="ClauseOps AI home">
    <span className="brand-icon">
      <Icon name="shield" size={23} />
    </span>
    <span>ClauseOps <span className="brand-ai">AI</span>
    </span>
  </Link>;
}
export function StatusBadge({ status }: {
  status: string;
}) {
  const tone = status === "Completed" || status === "Active" || status === "Reviewed" ? "green" : status === "Overdue" || status === "Needs Replacement" ? "red" : status === "Due Soon" || status === "Missing Evidence" || status === "Awaiting Review" ? "amber" : status === "Needs Review" ? "violet" : "neutral";
  return <span className={`badge ${tone}`}>
    <span className="status-dot" />{status}</span>;
}
export function ConfidenceBadge({ confidence }: {
  confidence: ConfidenceLevel;
}) {
  return <span className={`confidence ${confidence.toLowerCase()}`}>
    <span aria-hidden="true">▥</span> {confidence}</span>;
}
export function EvidenceStatusBadge({ status }: {
  status: Evidence["verificationStatus"];
}) { return <StatusBadge status={status} />; }
export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return <div className="page-heading">
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>
      <p>{description}</p>
    </div>{action && <div className="heading-action">{action}</div>}</div>;
}
export function SectionCard({ title, subtitle, action, children, className = "" }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>
    <div className="card-heading">
      <div>
        <h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
export function StatCard({ label, value, note, icon, tone = "blue" }: {
  label: string;
  value: number | string;
  note: string;
  icon: IconName;
  tone?: string;
}) {
  return <div className="stat-card">
    <div className="stat-top">
      <span>{label}</span>
      <span className={`icon-tile ${tone}`}>
        <Icon name={icon} size={18} />
      </span>
    </div>
    <strong>{value}</strong>
    <p>{note}</p>
  </div>;
}
export function EmptyState({ title, description }: {
  title: string;
  description: string;
}) {
  return <div className="empty-state">
    <Icon name="search" size={28} />
    <h3>{title}</h3>
    <p>{description}</p>
  </div>;
}
export function ContractCard({ contract }: {
  contract: Contract;
}) {
  const items = obligations.filter(o => o.contractId === contract.id); return <article className="contract-card">
    <div className="flex items-start justify-between gap-3">
      <span className="file-icon">
        <Icon name="file" size={25} />
      </span>
      <StatusBadge status={contract.status} />
    </div>
    <h2>
      <Link href={`/contracts/${contract.id === "grant" ? "demo" : contract.id}`}>{contract.name}</Link>
    </h2>
    <p>{contract.organization}</p>
    <div className="contract-meta">
      <span>{contract.type}</span>
      <span>{items.length} obligations</span>
    </div>
    <div className="contract-bottom">
      <span>Added {formatDate(contract.uploadDate)}</span>
      <Icon name="arrow" size={17} />
    </div>
  </article>;
}
export function ProgressBar({ label, value, note }: {
  label: string;
  value: number;
  note?: string;
}) {
  return <div className="progress-item">
    <div>
      <span>{label}</span>
      <strong>{value}%</strong>
    </div>
    <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${value}%` }} />
    </div>{note && <p>{note}</p>}</div>;
}
export function DemoNotice({ children = "Demo workspace · Illustrative data as of 20 September 2026. No live analysis or verification." }: {
  children?: ReactNode;
}) {
  return <div className="demo-notice">
    <Icon name="shield" size={16} />
    <span>{children}</span>
  </div>;
}
