"use client";
import { useState } from "react";
import Link from "next/link";
import type { Contract } from "@/types";
import { obligations } from "@/mock-data";
import { formatDate } from "@/lib/format";
import { DemoNotice, PageHeader, SectionCard, StatCard, StatusBadge } from "./ui";
import { ObligationTable } from "./obligation-table";
import { Icon } from "./icon";
const tabs = ["Overview", "Obligations", "Risks", "Key Clauses", "AI Summary"];
export function ContractDetail({ contract }: {
  contract: Contract;
}) {
  const [tab, setTab] = useState("Overview");
  const items = obligations.filter(o => o.contractId === contract.id);
  const risks = items.filter(o => ["Overdue", "Needs Review", "Missing Evidence"].includes(o.status));
  const next = items.filter(o => o.status !== "Completed").sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  return <>
    <Link className="back-link" href="/contracts">← All contracts</Link>
    <PageHeader eyebrow="DOCUMENT WORKSPACE" title={contract.name} description={contract.description} action={<StatusBadge status={contract.status} />} />
    <DemoNotice>Fictional source document and sample analysis. No document was processed by AI.</DemoNotice>
    <div className="stats-grid four">
      <StatCard label="Obligations" value={items.length} note="Linked to source clauses" icon="check" />
      <StatCard label="Next open deadline" value={next ? formatDate(next.deadline).replace(" 2026", "") : "None"} note={next?.status === "Overdue" ? "Overdue · needs attention" : "Demo tracking date"} icon="calendar" tone="amber" />
      <StatCard label="Risk areas" value={risks.length} note="Operational review flags" icon="alert" tone="red" />
      <StatCard label="Evidence required" value={items.reduce((sum, o) => sum + o.evidenceRequired.length, 0)} note="Across all obligations" icon="shield" tone="violet" />
    </div>
    <div className="tabs" role="tablist" aria-label="Contract details">{tabs.map((t, index) => <button key={t} role="tab" id={`tab-${index}`} aria-selected={tab === t} aria-controls="contract-panel" tabIndex={tab === t ? 0 : -1} onClick={() => setTab(t)} onKeyDown={e => {
      if(["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const nextIndex = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        setTab(tabs[nextIndex]);
        document.getElementById(`tab-${nextIndex}`)?.focus();
      }
    }}>{t}{t === "Obligations" && <span>{items.length}</span>}</button>)}</div>
    <div role="tabpanel" id="contract-panel" aria-labelledby={`tab-${tabs.indexOf(tab)}`} tabIndex={0}>
      {tab === "Overview" && <div className="two-col wide-left">
        <SectionCard title="Document overview" subtitle="SOURCE · Original document context">
          <dl className="detail-grid">
            <div>
              <dt>Organisation</dt>
              <dd>{contract.organization}</dd>
            </div>
            <div>
              <dt>Agreement type</dt>
              <dd>{contract.type}</dd>
            </div>
            <div>
              <dt>Uploaded</dt>
              <dd>{formatDate(contract.uploadDate)}</dd>
            </div>
            <div>
              <dt>Document</dt>
              <dd>{contract.pages} pages · {contract.size} · PDF</dd>
            </div>
          </dl>
          <hr />
          <h3>What needs your attention</h3>
          <div className="compact-obligations">{items.filter(o => o.status !== "Completed").map(o => <Link key={o.id} href={`/obligations/${o.id === "1" ? "demo" : o.id}`}>
            <div>
              <strong>{o.title}</strong>
              <small>{o.owner} · {formatDate(o.deadline)}</small>
            </div>
            <Icon name="arrow" size={16} />
          </Link>)}</div>
        </SectionCard>
        <SectionCard title="A traceable compliance record" subtitle="Four layers. Clear boundaries.">
          <div className="layer-list">{[["01", "Source", "The original clause, section, and page."], ["02", "AI interpretation", "Demo suggestions for human review."], ["03", "Compliance state", "A fixed snapshot of operational progress."], ["04", "Verification", "Independent verification is not active."]].map(([n, t, d]) => <div key={n}>
            <span>{n}</span>
            <div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          </div>)}</div>
        </SectionCard>
      </div>}
      {tab === "Obligations" && <div className="card">
        <ObligationTable items={items} />
      </div>}
      {tab === "Risks" && <SectionCard title="Operational risk areas" subtitle="Demo flags for review, not legal risk advice">{risks.length ? risks.map(o => <div className="risk-row" key={o.id}>
        <span className="icon-tile amber">
          <Icon name="alert" />
        </span>
        <div>
          <Link className="table-title" href={`/obligations/${o.id}`}>{o.title}</Link>
          <p>{o.description}</p>
          <small>Source: §{o.source.section} · page {o.source.page}</small>
        </div>
        <StatusBadge status={o.status} />
      </div>) : <p className="small-muted">No operational flags in this sample. This does not establish legal compliance.</p>}</SectionCard>}
      {tab === "Key Clauses" && <div className="clause-list">{items.map(o => <SectionCard key={o.id} title={o.source.section} subtitle={`SOURCE · Page ${o.source.page} · Fictional document`}>
        <blockquote>{o.source.quote}</blockquote>
        <Link className="text-link" href={`/obligations/${o.id === "1" ? "demo" : o.id}`}>View linked obligation <Icon name="arrow" size={15} />
        </Link>
      </SectionCard>)}</div>}
      {tab === "AI Summary" && <SectionCard title="Sample AI interpretation" subtitle="DEMO · Authored sample, not a live model response">
        <div className="summary-copy">
          <p>This {contract.type.toLowerCase()} with {contract.organization} contains {items.length} tracked obligations in this demo. The suggested plan separates each requirement into an action, an owner, a deadline, and an evidence record.</p>
          <h3>Suggested focus</h3>
          <ul>{items.map(o => <li key={o.id}>{o.title} — {o.owner}, {formatDate(o.deadline)}{o.id === "7" ? " (internal review target)" : ""}.</li>)}</ul>
          <p>Check each interpretation against its source wording. Inferred owners and operational review dates should be confirmed by the responsible team.</p>
        </div>
      </SectionCard>}
    </div>
  </>;
}
