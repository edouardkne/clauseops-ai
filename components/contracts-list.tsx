"use client";
import { useState } from "react";
import Link from "next/link";
import { contracts, obligations } from "@/mock-data";
import { formatDate } from "@/lib/format";
import { ContractCard, EmptyState, StatusBadge } from "./ui";
import { Icon } from "./icon";
export function ContractsList() {
  const [query, setQuery] = useState(""); const [view, setView] = useState("list"); const filtered = contracts.filter(c => `${c.name} ${c.organization} ${c.type}`.toLowerCase().includes(query.toLowerCase())); return <>
    <div className="table-toolbar standalone">
      <label className="search-field">
        <Icon name="search" size={18} />
        <input placeholder="Search contracts or organisations…" aria-label="Search contracts" value={query} onChange={e => setQuery(e.target.value)} />
      </label>
      <span className="result-count" aria-live="polite">{filtered.length} documents</span>
      <div className="view-switch">
        <button onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="List view">
          <Icon name="menu" size={17} />
        </button>
        <button onClick={() => setView("grid")} aria-pressed={view === "grid"} aria-label="Card view">
          <Icon name="grid" size={17} />
        </button>
      </div>
    </div>{!filtered.length ? <EmptyState title="No matching contracts" description="Search by document name, organisation, or agreement type." /> : view === "grid" ? <div className="contract-grid">{filtered.map(c => <ContractCard key={c.id} contract={c} />)}</div> : <div className="card table-scroll" tabIndex={0} role="region" aria-label="Contracts table">
      <table>
        <thead>
          <tr>{["Contract name", "Type / Organisation", "Upload date", "Obligations", "Status", "Next deadline"].map(h => <th key={h} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>{filtered.map(c => {
          const items = obligations.filter(o => o.contractId === c.id); const next = items.filter(o => o.status !== "Completed").sort((a, b) => a.deadline.localeCompare(b.deadline))[0]; return <tr key={c.id}>
            <td>
              <Link className="table-title document-title" href={`/contracts/${c.id === "grant" ? "demo" : c.id}`}>
                <Icon name="file" />{c.name}</Link>
              <small>{c.pages} pages · {c.size}</small>
            </td>
            <td>{c.type}<small>{c.organization}</small>
            </td>
            <td>{formatDate(c.uploadDate)}</td>
            <td>{items.length} obligations</td>
            <td>
              <StatusBadge status={c.status} />
            </td>
            <td>{next ? formatDate(next.deadline) : "No open obligations"}{next?.status === "Overdue" && <small className="text-red">Overdue · action required</small>}{next?.id === "7" && <small>Internal review target</small>}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>}</>;
}
