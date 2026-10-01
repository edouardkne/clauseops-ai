"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { EmptyState } from "./ui";
import { useAnalysisSession } from "./analysis-session";
import { answerQuery, LOCAL_QUESTIONS } from "@/lib/intelligence/queries";
import type { AnalysisSession, Intelligence } from "@/lib/intelligence/types";

export function AssistantChat() {
  const { current, intelligence } = useAnalysisSession();
  if (!current || !intelligence) return <div className="card assistant-empty">
    <EmptyState title="No analysed contract in this session" description="Analyse a PDF first to ask grounded questions about its obligations. This assistant does not substitute fictional demo records." />
    <Link className="button primary" href="/contracts/upload">Analyse a contract <Icon name="arrow" size={16} /></Link>
  </div>;
  return <GroundedChat key={current.key} session={current} intelligence={intelligence} />;
}

function GroundedChat({ session, intelligence }: { session: AnalysisSession; intelligence: Intelligence }) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  function ask(question: string) {
    if (!question.trim()) return;
    setQuestions(previous => [...previous, question.trim()]);
    setDraft("");
  }
  return <div className="assistant-layout">
    <div className="chat-card">
      <div className="chat-heading">
        <span className="icon-tile violet"><Icon name="spark" /></span>
        <div><h2>Contract intelligence assistant</h2><p className="current-contract">Current document: {session.filename}</p></div>
        <span className="badge green">Local answers</span>
      </div>
      <div className="messages" role="log" aria-label="Current contract conversation" aria-live="polite">
        <div className="message assistant"><span className="assistant-avatar"><Icon name="spark" size={17} /></span><div><strong>ClauseOps · Deterministic intelligence</strong><p>Ask about counts, responsibilities, evidence requirements, deadlines, or sources in this document. Answers use the current structured analysis and operational rules, with zero provider calls. They are not legal advice.</p></div></div>
        {questions.map((question, index) => {
          const answer = answerQuery(question, intelligence);
          return <div key={index} className="conversation-turn">
            <div className="message user"><div><strong>You</strong><p>{question}</p></div></div>
            <div className="message assistant"><span className="assistant-avatar"><Icon name="spark" size={17} /></span><div>
              <strong>{answer.kind === "local" ? "ClauseOps · Local structured lookup" : "Synthesis not enabled · No request sent"}</strong>
              <p>{answer.text}</p>
              <div className="answer-sources">{answer.obligationIds.slice(0, 10).map(id => {
                const o = intelligence.obligations.find(o => o.id === id)!;
                return <Link key={id} className="source-chip" href={`/contracts/upload#obligation-${id}`}><Icon name="file" size={13} />#{o.number} · Page {o.source.pageNumber} · {o.sourceVerified ? "Verified quote" : "Unverified quote"}</Link>;
              })}</div>
              {answer.obligationIds.length > 10 && <p>Source links show the first 10 matches; all matching obligations are listed above.</p>}
            </div></div>
          </div>;
        })}
      </div>
      <form className="chat-composer" onSubmit={event => { event.preventDefault(); ask(draft); }}>
        <label htmlFor="assistant-question" className="sr-only">Ask about the current contract</label>
        <input id="assistant-question" value={draft} maxLength={1000} onChange={event => setDraft(event.target.value)} placeholder="Ask about this contract’s obligations…" />
        <button className="icon-button send-button" type="submit" aria-label="Send question" disabled={!draft.trim()}><Icon name="arrow" /></button>
      </form>
      <p className="chat-disclaimer">Local lookups only · No generative calls · No compliance verdicts</p>
    </div>
    <aside className="assistant-prompts">
      <div className="eyebrow">CURRENT CONTRACT · NO API COST</div>
      <h2>Find the obligation.<br />Return to the source.</h2>
      <p>Use a suggested question, or refer to an obligation by its displayed number. Answers reflect the current session state.</p>
      {LOCAL_QUESTIONS.map(question => <button key={question} onClick={() => ask(question)}><Icon name="search" size={17} /><span>{question}</span><Icon name="arrow" size={15} /></button>)}
      <div className="assistant-boundary"><Icon name="shield" /><h3>Synthesis stays separate</h3><p>Questions requiring generative reasoning are routed to an explicit unavailable state. No automatic calls, fallback model requests, or document transmission occur.</p></div>
    </aside>
  </div>;
}
