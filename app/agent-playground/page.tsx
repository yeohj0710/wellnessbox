"use client";

import { useMemo, useState } from "react";

import type {
  PlaygroundMode,
  PlaygroundRunResult,
  TraceEvent,
} from "@/lib/agent-playground/types";

const toPreview = (text?: string, max = 120) => {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const TraceCard = ({
  event,
  index,
  expanded,
  onToggle,
}: {
  event: TraceEvent;
  index: number;
  expanded: boolean;
  onToggle: (index: number) => void;
}) => (
  <div
    className="border rounded-lg p-3 bg-white shadow-sm hover:shadow transition cursor-pointer"
    onClick={() => onToggle(index)}
  >
    <div className="flex items-center justify-between">
      <div className="font-semibold text-sm">{event.type}</div>
      <div className="text-xs text-gray-500">{event.ms}ms</div>
    </div>
    <div className="text-sm text-gray-700 mt-1">
      {event.name && <span className="mr-2 text-indigo-600">[{event.name}]</span>}
      {toPreview(event.outputPreview || event.inputPreview)}
    </div>
    {expanded && (
      <pre className="mt-2 bg-gray-50 text-xs text-gray-700 p-2 rounded overflow-x-auto">
        {JSON.stringify(event, null, 2)}
      </pre>
    )}
  </div>
);

const ResultPanel = ({
  title,
  result,
  active,
  onActivate,
}: {
  title: string;
  result: PlaygroundRunResult | null;
  active: boolean;
  onActivate: () => void;
}) => (
  <div className="border rounded-xl p-4 bg-white shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <h2 className="font-semibold text-gray-800">{title}</h2>
      {result && (
        <button
          className={`text-xs px-2 py-1 rounded ${
            active ? "bg-indigo-600 text-white" : "bg-gray-100"
          }`}
          onClick={onActivate}
        >
          Trace 보기
        </button>
      )}
    </div>
    <div className="text-sm text-gray-800 whitespace-pre-wrap min-h-[120px]">
      {result?.error
        ? `⚠️ ${result.error}`
        : result?.answer || "아직 실행하지 않았습니다."}
    </div>
    {result?.meta && (
      <div className="mt-3 text-xs text-gray-600 space-y-1">
        <div className="bg-gray-50 p-2 rounded border text-[11px] text-gray-700">
          {JSON.stringify(result.meta, null, 2)}
        </div>
      </div>
    )}
  </div>
);

export default function AgentPlaygroundPage() {
  const [message, setMessage] = useState(
    "도구 활용 예시를 보여주세요. 12 * 3 + 5 계산도 포함해 주세요."
  );
  const [llmResult, setLlmResult] = useState<PlaygroundRunResult | null>(null);
  const [agentResult, setAgentResult] = useState<PlaygroundRunResult | null>(null);
  const [loading, setLoading] = useState<PlaygroundMode | null>(null);
  const [activeTrace, setActiveTrace] = useState<"llm" | "agent">("agent");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [serverError, setServerError] = useState<string | null>(null);

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const callApi = async (mode: PlaygroundMode) => {
    const res = await fetch("/api/agent-playground/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, mode }),
    });

    const data = (await res.json()) as {
      llm?: PlaygroundRunResult;
      agent?: PlaygroundRunResult;
      error?: string;
    };

    if (!res.ok) {
      throw new Error(data?.error || res.statusText);
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
      if (mode === "agent") setActiveTrace("agent");
      if (mode === "both") setActiveTrace("agent");

      if (data.error) setServerError(data.error);
    } catch (error) {
      const message = error instanceof Error ? error.message : "서버 오류";
      setServerError(message);
    } finally {
      setLoading(null);
    }
  };

  const currentTrace = useMemo(() => {
    return activeTrace === "llm"
      ? llmResult?.trace || []
      : agentResult?.trace || [];
  }, [activeTrace, agentResult?.trace, llmResult?.trace]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Agent Playground</h1>
        <p className="text-gray-600 text-sm">
          LLM 단독 호출과 tool-calling agent를 한 페이지에서 비교 실행합니다.
        </p>
      </div>

      <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
        <textarea
          className="w-full border rounded-lg p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="질문을 입력하세요"
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
            onClick={() => handleRun("llm")}
            disabled={loading !== null}
          >
            {loading === "llm" ? "LLM 실행 중..." : "LLM 실행"}
          </button>
          <button
            className="px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
            onClick={() => handleRun("agent")}
            disabled={loading !== null}
          >
            {loading === "agent" ? "agent 실행 중..." : "agent 실행"}
          </button>
          <button
            className="px-3 py-2 rounded bg-gray-900 text-white text-sm disabled:opacity-50"
            onClick={() => handleRun("both")}
            disabled={loading !== null}
          >
            {loading === "both" ? "둘 다 실행 중..." : "둘 다 실행"}
          </button>
        </div>
        {serverError && (
          <div className="text-sm text-red-600">서버 오류: {serverError}</div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ResultPanel
          title="LLM 결과"
          result={llmResult}
          active={activeTrace === "llm"}
          onActivate={() => setActiveTrace("llm")}
        />
        <ResultPanel
          title="Agent 결과"
          result={agentResult}
          active={activeTrace === "agent"}
          onActivate={() => setActiveTrace("agent")}
        />
      </div>

      <div className="border rounded-xl p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-800">Trace Timeline</h3>
            <p className="text-xs text-gray-600">
              카드를 클릭하면 상세 JSON을 확인합니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className={`text-xs px-3 py-1 rounded ${
                activeTrace === "llm" ? "bg-indigo-600 text-white" : "bg-gray-100"
              }`}
              onClick={() => setActiveTrace("llm")}
              disabled={!llmResult?.trace?.length}
            >
              LLM Trace
            </button>
            <button
              className={`text-xs px-3 py-1 rounded ${
                activeTrace === "agent"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100"
              }`}
              onClick={() => setActiveTrace("agent")}
              disabled={!agentResult?.trace?.length}
            >
              Agent Trace
            </button>
          </div>
        </div>
        {currentTrace.length === 0 ? (
          <div className="text-sm text-gray-600">아직 trace가 없습니다.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {currentTrace.map((event, idx) => (
              <TraceCard
                key={`${event.type}-${idx}`}
                event={event}
                index={idx}
                expanded={expandedCards.has(idx)}
                onToggle={toggleCard}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
