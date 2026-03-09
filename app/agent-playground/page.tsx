"use client";

import { useEffect, useMemo, useState } from "react";

import {
  PlaygroundMode,
  PlaygroundResponse,
  PlaygroundRunResult,
} from "@/lib/agent-playground/types";
import { patternSummaries } from "@/lib/agent-playground/pattern-registry";

import { AgentPlaygroundControlPanel } from "./_components/AgentPlaygroundControlPanel";
import { AgentPlaygroundResultPanel } from "./_components/AgentPlaygroundResultPanel";
import { AgentPlaygroundTraceTimeline } from "./_components/AgentPlaygroundTraceTimeline";
import {
  AgentPlaygroundActiveTrace,
  buildComparisonSummary,
  extractEvaluation,
  resolveCurrentTrace,
} from "./_lib/agent-playground-page-model";

export default function AgentPlaygroundPage() {
  const [patternId, setPatternId] = useState(patternSummaries[0]?.id || "");
  const [message, setMessage] = useState(patternSummaries[0]?.defaultPrompt || "");
  const [llmResult, setLlmResult] = useState<PlaygroundRunResult | null>(null);
  const [agentResult, setAgentResult] = useState<PlaygroundRunResult | null>(null);
  const [loading, setLoading] = useState<PlaygroundMode | null>(null);
  const [activeTrace, setActiveTrace] =
    useState<AgentPlaygroundActiveTrace>("agent");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [serverError, setServerError] = useState<string | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [pendingDefault, setPendingDefault] = useState(false);

  const selectedPattern = useMemo(
    () => patternSummaries.find((pattern) => pattern.id === patternId) || patternSummaries[0],
    [patternId]
  );

  useEffect(() => {
    const defaultPrompt = selectedPattern?.defaultPrompt || "";

    if (!hasUserEdited || message.trim() === "") {
      setMessage(defaultPrompt);
      setHasUserEdited(false);
      setPendingDefault(false);
      return;
    }

    setPendingDefault(message !== defaultPrompt);
  }, [selectedPattern?.id, hasUserEdited, message]);

  const currentTrace = useMemo(
    () => resolveCurrentTrace(activeTrace, llmResult, agentResult),
    [activeTrace, agentResult, llmResult]
  );

  const llmEval = extractEvaluation(llmResult);
  const agentEval = extractEvaluation(agentResult);

  const comparisonSummary = useMemo(
    () => buildComparisonSummary(llmEval, agentEval),
    [agentEval, llmEval]
  );

  const toggleCard = (index: number) => {
    setExpandedCards((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleApplyDefault = () => {
    setMessage(selectedPattern?.defaultPrompt || "");
    setHasUserEdited(false);
    setPendingDefault(false);
  };

  const callApi = async (mode: PlaygroundMode) => {
    const response = await fetch("/api/agent-playground/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, mode, patternId }),
    });

    const data = (await response.json()) as PlaygroundResponse;

    if (!response.ok) {
      throw new Error(data?.error || response.statusText);
    }

    return data;
  };

  const handleRun = async (mode: PlaygroundMode) => {
    setLoading(mode);
    setExpandedCards(new Set());
    setServerError(null);

    try {
      const data = await callApi(mode);
      setLlmResult(data.llm ?? null);
      setAgentResult(data.agent ?? null);

      if (mode === "llm") setActiveTrace("llm");
      if (mode === "agent" || mode === "both") setActiveTrace("agent");

      if (data.error) setServerError(data.error);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "서버 오류");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Agent Playground</h1>
        <p className="text-sm text-gray-600">
          단일 LLM 응답과 agent 워크플로를 같은 화면에서 비교 실행합니다.
        </p>
      </div>

      <AgentPlaygroundControlPanel
        comparisonSummary={comparisonSummary}
        loading={loading}
        message={message}
        patternId={patternId}
        patternSummaries={patternSummaries}
        pendingDefault={pendingDefault}
        selectedPattern={selectedPattern}
        serverError={serverError}
        onApplyDefault={handleApplyDefault}
        onMessageChange={(nextMessage) => {
          setMessage(nextMessage);
          setHasUserEdited(true);
        }}
        onPatternChange={setPatternId}
        onRun={handleRun}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <AgentPlaygroundResultPanel
          title="LLM 결과"
          result={llmResult}
          active={activeTrace === "llm"}
          onActivate={() => setActiveTrace("llm")}
        />
        <AgentPlaygroundResultPanel
          title="Agent 결과"
          result={agentResult}
          active={activeTrace === "agent"}
          onActivate={() => setActiveTrace("agent")}
        />
      </div>

      <AgentPlaygroundTraceTimeline
        activeTrace={activeTrace}
        currentTrace={currentTrace}
        expandedCards={expandedCards}
        hasAgentTrace={Boolean(agentResult?.trace?.length)}
        hasLlmTrace={Boolean(llmResult?.trace?.length)}
        onActiveTraceChange={setActiveTrace}
        onToggleCard={toggleCard}
      />
    </div>
  );
}
