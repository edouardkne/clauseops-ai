"use client";
import { useState } from "react";
import Link from "next/link";
import { assistantAnswers, assistantQuestions } from "@/mock-data";
import { Icon } from "./icon";
type Message = {
  role: "user" | "assistant";
  text: string;
  source?: boolean;
};
export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Welcome, Amara. I can walk you through this fictional workspace using prepared demo answers. Choose a question below to explore obligations, evidence, or source clauses." }]);
  const [draft, setDraft] = useState("");
  function ask(question: string) {
    const clean = question.trim(); if(!clean)
      return; const index = assistantQuestions.findIndex(q => q.toLowerCase() === clean.toLowerCase()); setMessages(previous => [...previous, { role: "user", text: clean }, { role: "assistant", text: index >= 0 ? assistantAnswers[index] : "This is a scripted demo, so I cannot analyse new questions or documents. Choose one of the four sample questions to see a prepared response. No AI provider is connected.", source: index === 1 || index === 3 }]); setDraft("");
  }
  return <div className="assistant-layout">
    <div className="chat-card">
      <div className="chat-heading">
        <span className="icon-tile violet">
          <Icon name="spark" />
        </span>
        <div>
          <h2>Compliance assistant</h2>
          <p>Source-aware by design. Scripted for this demo.</p>
        </div>
        <span className="badge violet">Demo</span>
      </div>
      <div className="messages" role="log" aria-label="Demo conversation" aria-live="polite">{messages.map((m, i) => <div className={`message ${m.role}`} key={i}>
        <span className={m.role === "assistant" ? "assistant-avatar" : "avatar small"}>{m.role === "assistant" ? <Icon name="spark" size={17} /> : "AO"}</span>
        <div>
          <strong>{m.role === "assistant" ? "ClauseOps · Demo response" : "You"}</strong>
          <p>{m.text}</p>{m.source && <Link className="source-chip" href={m.text === assistantAnswers[1] ? "/obligations/7" : "/obligations/demo"}>
            <Icon name="file" size={14} />View source clause <Icon name="arrow" size={14} />
          </Link>}</div>
      </div>)}</div>
      <form className="chat-composer" onSubmit={e => { e.preventDefault(); ask(draft); }}>
        <label htmlFor="assistant-question" className="sr-only">Ask a demo compliance question</label>
        <input id="assistant-question" value={draft} maxLength={1000} onChange={e => setDraft(e.target.value)} placeholder="Ask about your demo obligations…" />
        <button className="icon-button send-button" type="submit" aria-label="Send question" disabled={!draft.trim()}>
          <Icon name="arrow" />
        </button>
      </form>
      <p className="chat-disclaimer">Mock responses only · No AI analysis · Review original source documents</p>
    </div>
    <aside className="assistant-prompts">
      <div className="eyebrow">START WITH A QUESTION</div>
      <h2>Less searching.<br />More understanding.</h2>
      <p>Explore the context behind the compliance state.</p>{assistantQuestions.map((q, i) => <button key={q} onClick={() => ask(q)}>
        <Icon name={i === 0 ? "calendar" : i === 1 ? "alert" : i === 2 ? "shield" : "file"} size={18} />
        <span>{q}</span>
        <Icon name="arrow" size={15} />
      </button>)}<div className="assistant-boundary">
        <Icon name="shield" size={20} />
        <h3>Grounded in the source</h3>
        <p>Future responses should distinguish source text, AI interpretation, tracking state, and independently verified evidence.</p>
      </div>
    </aside>
  </div>;
}
