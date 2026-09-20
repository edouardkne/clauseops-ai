"use client";
import Link from "next/link";
import { useState } from "react";
import type { Obligation } from "@/types";
import { evidence } from "@/mock-data";
import { formatDate } from "@/lib/format";
import { ConfidenceBadge, EmptyState, StatusBadge } from "./ui";
import { Icon } from "./icon";
export function ObligationTable({ items, filters = true }: {
  items: Obligation[];
  filters?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const filtered = items.filter(o => `${o.title} ${o.owner} ${o.category}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || o.status === status));
  return <>{filters && <div className="table-toolbar">
    <label className="search-field">
      <Icon name="search" size={18} />
      <input aria-label="Search obligations" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search obligations, owners…" />
    </label>
    <label className="filter-field">
      <span className="sr-only">Filter by status</span>
      <select value={status} onChange={e => setStatus(e.target.value)}>{["All statuses", "Pending", "Due Soon", "Completed", "Missing Evidence", "Overdue", "Needs Review"].map(s => <option key={s}>{s}</option>)}</select>
    </label>
    <span className="result-count" aria-live="polite">{filtered.length} obligations</span>
  </div>}{filtered.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Obligations table">
    <table>
      <thead>
        <tr>{["Obligation", "Category", "Owner", "Deadline", "Status", "Evidence", "Confidence"].map(h => <th key={h} scope="col">{h}</th>)}</tr>
      </thead>
      <tbody>{filtered.map(o => <tr key={o.id}>
        <td>
          <Link className="table-title" href={`/obligations/${o.id === "1" ? "demo" : o.id}`}>{o.title}</Link>
          <small>OBL-{o.id.padStart(3, "0")}</small>
        </td>
        <td>{o.category}</td>
        <td>
          <span className="owner">
            <span className="avatar tiny">{o.owner.split(" ").map(n => n[0]).join("")}</span>{o.owner}</span>
        </td>
        <td className={o.status === "Overdue" ? "text-red" : ""}>{formatDate(o.deadline)}{o.id === "7" && <small>Internal review target</small>}</td>
        <td>
          <StatusBadge status={o.status} />
        </td>
        <td>
          <Link href="/evidence" className="evidence-count">
            <Icon name="link" size={15} />{evidence.filter(e => e.obligationId === o.id).length} files</Link>
        </td>
        <td>
          <ConfidenceBadge confidence={o.confidence} />
        </td>
      </tr>)}</tbody>
    </table>
  </div> : <EmptyState title="No matching obligations" description="Try a different search or choose another status." />}</>;
}
