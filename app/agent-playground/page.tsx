"use client";

import { useEffect, useMemo, useState } from "react";

import {
  PlaygroundMode,
  PlaygroundRunResult,
  TraceEvent,
} from "@/lib/agent-playground/types";
import { patternSummaries } from "@/lib/agent-playground/patterns";

const toPreview = (text?: string, max = 120) => {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const EvaluationSummary = ({
  evaluation,
}: {
  evaluation?: { pass?: boolean; violations?: string[] };
}) => {
  if (!evaluation) return null;
  const pass = evaluation.pass ?? false;
  return (
    <div className="text-xs mt-2">
      <div
        className={`inline-flex items-center px-2 py-1 rounded-md font-semibold ${
          pass ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}
      >
        {pass ? "PASS" : "FAIL"}
      </div>
      {!pass && evaluation.violations && evaluation.violations.length > 0 && (
        <ul className="mt-1 list-disc list-inside text-[11px] text-gray-700 space-y-0.5">
          {evaluation.violations.map((v, idx) => (
            <li key={idx}>{v}</li>
          ))}
        </ul>
      )}
    </div>
  );
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
}) => {
  const isStep = event.type === "STEP";
  const typeBadge = (
    <span
      className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
        isStep
          ? "bg-indigo-100 text-indigo-700"
          : event.type === "ERROR"
            ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-700"
      }`}
    >
      {event.type}
    </span>
  );

  return (
    <div
      className={`border rounded-lg p-3 shadow-sm transition cursor-pointer ${
        isStep ? "bg-indigo-50 border-indigo-100" : "bg-white hover:shadow"
      }`}
      onClick={() => onToggle(index)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">{typeBadge}</div>
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
};

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
}) => {
  const evaluation = (result?.meta as any)?.evaluation as
    | { pass?: boolean; violations?: string[]; score?: number }
    | undefined;
  const [showMeta, setShowMeta] = useState(false);
  const pass = evaluation?.pass ?? false;

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          {evaluation && (
            <span
              className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}
            >
              {pass ? "PASS" : "FAIL"}
              {typeof evaluation.score === "number" && (
                <span className="ml-1 font-normal">({evaluation.score})</span>
              )}
            </span>
          )}
        </div>
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
      {evaluation && <EvaluationSummary evaluation={evaluation} />}
      {result?.meta && (
        <div className="mt-3 text-xs text-gray-600 space-y-1">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-[11px] text-gray-700">메타데이터</div>
            <button
              className="text-[11px] px-2 py-1 rounded bg-gray-100"
              onClick={() => setShowMeta((prev) => !prev)}
            >
              {showMeta ? "접기" : "펼치기"}
            </button>
          </div>
          {!showMeta && (
            <div className="bg-gray-50 p-2 rounded border text-[11px] text-gray-700 flex flex-wrap gap-x-3 gap-y-1">
              {(result.meta as any)?.patternId && <span>pattern: {(result.meta as any).patternId}</span>}
              {typeof (result.meta as any)?.llmCalls === "number" && (
                <span>llmCalls: {(result.meta as any).llmCalls}</span>
              )}
              {typeof (result.meta as any)?.iterations === "number" && (
                <span>iterations: {(result.meta as any).iterations}</span>
              )}
              {typeof (result.meta as any)?.hardRepairs === "number" && (
                <span>repairs: {(result.meta as any).hardRepairs}</span>
              )}
            </div>
          )}
          {showMeta && (
            <div className="bg-gray-50 p-2 rounded border text-[11px] text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(result.meta, null, 2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function AgentPlaygroundPage() {
  const [patternId, setPatternId] = useState(patternSummaries[0]?.id || "");
  const [message, setMessage] = useState(patternSummaries[0]?.defaultPrompt || "");
  const [llmResult, setLlmResult] = useState<PlaygroundRunResult | null>(null);
  const [agentResult, setAgentResult] = useState<PlaygroundRunResult | null>(null);
  const [loading, setLoading] = useState<PlaygroundMode | null>(null);
  const [activeTrace, setActiveTrace] = useState<"llm" | "agent">("agent");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [serverError, setServerError] = useState<string | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [pendingDefault, setPendingDefault] = useState(false);

  const selectedPattern = useMemo(
    () => patternSummaries.find((p) => p.id === patternId) || patternSummaries[0],
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
    if (message !== defaultPrompt) {
      setPendingDefault(true);
    } else {
      setPendingDefault(false);
    }
  }, [selectedPattern?.id, hasUserEdited, message]);

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

  const handleApplyDefault = () => {
    setMessage(selectedPattern?.defaultPrompt || "");
    setHasUserEdited(false);
    setPendingDefault(false);
  };

  const callApi = async (mode: PlaygroundMode) => {
    const res = await fetch("/api/agent-playground/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, mode, patternId }),
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

  const llmEval = (llmResult?.meta as any)?.evaluation as
    | { pass?: boolean; score?: number }
    | undefined;
  const agentEval = (agentResult?.meta as any)?.evaluation as
    | { pass?: boolean; score?: number }
    | undefined;

  const comparisonSummary = useMemo(() => {
    if (!llmEval && !agentEval) return "";
    const llmScore = (llmEval?.score ?? 0) + (llmEval?.pass ? 1 : 0);
    const agentScore = (agentEval?.score ?? 0) + (agentEval?.pass ? 1.5 : 0);

    if (agentEval?.pass && !llmEval?.pass) {
      return "Agent가 제약을 충족했고 LLM은 실패했습니다.";
    }
    if (agentEval?.pass === llmEval?.pass) {
      if (agentScore > llmScore) return "Agent 출력이 더 나은 점수를 보였습니다.";
      if (agentScore < llmScore) return "LLM 출력이 더 높은 점수를 보였습니다.";
    }
    if (!agentEval?.pass && llmEval?.pass) {
      return "LLM이 통과했지만 agent는 추가 개선이 필요합니다.";
    }
    return "Agent가 제약 충족에 가까운 결과를 제공합니다.";
  }, [agentEval, llmEval]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Agent Playground</h1>
        <p className="text-gray-600 text-sm">
          LLM 단독 호출과 agent 워크플로를 한 페이지에서 비교 실행합니다.
        </p>
      </div>

      <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
        <div className="grid gap-2 md:grid-cols-3 items-start">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs text-gray-700">패턴 선택</label>
            <select
              className="w-full border rounded-lg p-2 text-sm"
              value={patternId}
              onChange={(e) => setPatternId(e.target.value)}
            >
              {patternSummaries.map((pattern) => (
                <option key={pattern.id} value={pattern.id}>
                  {pattern.name}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-700 bg-gray-50 border rounded p-2 leading-relaxed">
              <div className="font-semibold text-[11px] text-gray-800 mb-1">패턴 설명</div>
              <p className="text-[12px] text-gray-700">{selectedPattern?.description}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="w-full px-3 py-2 rounded bg-gray-100 text-xs"
              onClick={handleApplyDefault}
            >
              기본 프롬프트 불러오기
            </button>
            {pendingDefault && (
              <button
                className="w-full px-3 py-2 rounded bg-indigo-50 text-xs text-indigo-700 border border-indigo-100"
                onClick={handleApplyDefault}
              >
                새 패턴 기본 프롬프트 적용
              </button>
            )}
          </div>
        </div>

        {pendingDefault && (
          <div className="text-[11px] text-gray-600 bg-amber-50 border border-amber-200 rounded p-2">
            패턴이 변경되었습니다. 직접 수정한 메시지가 있어 자동 덮어쓰기를 건너뛰었습니다. "새 패턴 기본 프롬프트 적용"을 눌러 교체하세요.
          </div>
        )}

        <textarea
          className="w-full border rounded-lg p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setHasUserEdited(true);
          }}
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
        {comparisonSummary && (
          <div className="text-xs text-gray-700 bg-gray-50 border rounded p-2">
            {comparisonSummary}
          </div>
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
