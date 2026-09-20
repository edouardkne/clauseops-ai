"use client";
import Link from "next/link";
import { useState } from "react";
import { evidence, obligations } from "@/mock-data";
import { formatDate } from "@/lib/format";
import { DemoNotice, EvidenceStatusBadge, PageHeader, SectionCard } from "./ui";
import { Icon } from "./icon";
import { FilePicker } from "./file-picker";
export function EvidenceVault() {
  const [upload, setUpload] = useState(false); return <>
    <PageHeader eyebrow="THE RECORD BEHIND THE WORK" title="Evidence vault" description="Connect every completed action to the evidence that supports it." action={<button className="button primary" aria-expanded={upload} aria-controls="evidence-upload" onClick={() => setUpload(!upload)}>
      <Icon name={upload ? "close" : "upload"} size={17} />{upload ? "Close preview" : "Upload Evidence"}</button>} />
    <DemoNotice>Evidence files and review statuses are fictional. “Reviewed” means a sample human review, not independent verification.</DemoNotice>{upload && <div id="evidence-upload" className="upload-panel">
      <SectionCard title="Preview evidence selection" subtitle="Local selection only · no upload or persistence">
        <FilePicker kind="evidence" />
      </SectionCard>
    </div>}<div className="card table-scroll" role="region" aria-label="Evidence records" tabIndex={0}>
      <table>
        <thead>
          <tr>{["Evidence file", "Related obligation", "Type", "Uploaded date", "Verification status"].map(h => <th scope="col" key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>{evidence.map(e => {
          const o = obligations.find(o => o.id === e.obligationId)!; return <tr key={e.id}>
            <td>
              <span className="document-title">
                <Icon name="file" />
                <strong>{e.name}</strong>
              </span>
              <small>Demo record · file unavailable</small>
            </td>
            <td>
              <Link className="table-title" href={`/obligations/${o.id === "1" ? "demo" : o.id}`}>{o.title}</Link>
            </td>
            <td>{e.type}</td>
            <td>{formatDate(e.uploadedDate)}</td>
            <td>
              <EvidenceStatusBadge status={e.verificationStatus} />
            </td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <div className="two-col mt-section">
      <SectionCard title="Compliance receipt" subtitle="PROVE · Illustrative receipt preview" action={<span className="badge neutral">Not issued</span>}>
        <div className="receipt">
          <div>
            <span className="icon-tile violet">
              <Icon name="shield" size={24} />
            </span>
            <div>
              <h3>A record you can trace</h3>
              <p>A future receipt could connect a source clause, completed action, evidence reference, and verification outcome.</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Source</dt>
              <dd>Grant agreement · § 5.1</dd>
            </div>
            <div>
              <dt>Demo obligation</dt>
              <dd>Maintain grant expenditure records</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>Not independently verified</dd>
            </div>
          </dl>
          <p className="small-muted">No receipt, signature, hash, or proof has been generated.</p>
        </div>
      </SectionCard>
      <SectionCard title="Chainlink CRE" subtitle="Future verification integration" action={<span className="badge neutral">Not active</span>}>
        <div className="future-integration">
          <span className="integration-symbol">⬡</span>
          <h3>Independent verification, a future layer.</h3>
          <p>Planned integration for independently checking selected compliance evidence and producing traceable verification outcomes.</p>
          <div className="inline-note">
            <Icon name="clock" size={18} />
            <p>Chainlink CRE is not connected. No blockchain transactions, verification requests, or on-chain proofs are performed.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  </>;
}
