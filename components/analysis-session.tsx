"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { VerifiedContractAnalysis } from "@/lib/ai/contract-analysis-schema";
import { AnalysisCache } from "@/lib/intelligence/analysis-cache";
import { deriveIntelligence } from "@/lib/intelligence/engine";
import { buildObligationGraph } from "@/lib/intelligence/graph";
import type { AnalysisSession, Intelligence, ObligationGraph } from "@/lib/intelligence/types";

type SessionContext = {
  current: AnalysisSession | null;
  intelligence: Intelligence | null;
  graph: ObligationGraph | null;
  cache: AnalysisCache;
  activate: (key: string, filename: string, pageCount: number, analysis: VerifiedContractAnalysis) => void;
  clearCurrent: () => void;
  forgetAll: () => void;
  recordCompletion: (id: string, completed: boolean) => void;
  refreshDate: () => void;
};
const Context = createContext<SessionContext | null>(null);

export function AnalysisSessionProvider({ children }: { children: ReactNode }) {
  const [cache] = useState(() => new AnalysisCache());
  const sessions = useRef(new Map<string, AnalysisSession>());
  const [current, setCurrent] = useState<AnalysisSession | null>(null);
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const intelligence = useMemo(() => current ? deriveIntelligence(current.analysis, current.state, asOf) : null, [current, asOf]);
  const graph = useMemo(() => current ? buildObligationGraph(current) : null, [current]);

  function activate(key: string, filename: string, pageCount: number, analysis: VerifiedContractAnalysis) {
    const session = sessions.current.get(key) || { key, filename, pageCount, analysis, state: { completed: {}, evidenceLinks: [] } };
    sessions.current.set(key, session);
    setCurrent(session);
    setAsOf(new Date().toISOString().slice(0, 10));
  }
  function recordCompletion(id: string, completed: boolean) {
    if (!current?.analysis.obligations.some(o => o.id === id)) return;
    const updated = { ...current, state: { ...current.state, completed: { ...current.state.completed, [id]: completed } } };
    sessions.current.set(current.key, updated);
    setCurrent(updated);
  }
  return <Context.Provider value={{
    current, intelligence, graph, cache, activate, recordCompletion,
    clearCurrent: () => setCurrent(null),
    forgetAll: () => { cache.clear(); sessions.current.clear(); setCurrent(null); },
    refreshDate: () => setAsOf(new Date().toISOString().slice(0, 10)),
  }}>{children}</Context.Provider>;
}

export function useAnalysisSession() {
  const context = useContext(Context);
  if (!context) throw new Error("Analysis components require the workspace session provider.");
  return context;
}
