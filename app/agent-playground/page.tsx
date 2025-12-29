"use client";

import { useMemo, useState } from "react";
import type {
  AgentTestResponse,
  LlmTestResponse,
  TraceEvent,
} from "@/lib/demo/types";

type TraceSource = "llm" | "agent";

type RunMode = "LLM" | "AGENT" | "BOTH";

type AgentVersion = "v1" | "v2";

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
      {event.name && (
        <span className="mr-2 text-indigo-600">[{event.name}]</span>
      )}
      {toPreview(event.outputPreview || event.inputPreview)}
    </div>
    {expanded && (
      <pre className="mt-2 bg-gray-50 text-xs text-gray-700 p-2 rounded overflow-x-auto">
        {JSON.stringify(event, null, 2)}
      </pre>
    )}
  </div>
);

export default function AgentPlaygroundPage() {
  const [message, setMessage] = useState(
    "도구 활용 예시를 보여주세요. 12 * 3 + 5 계산도 포함해 주세요."
  );
  const [llmResult, setLlmResult] = useState<LlmTestResponse | null>(null);
  const [agentResult, setAgentResult] = useState<AgentTestResponse | null>(
    null
  );
  const [agentVersion, setAgentVersion] = useState<AgentVersion>("v1");
  const [lastAgentVersion, setLastAgentVersion] = useState<AgentVersion>("v1");
  const [loading, setLoading] = useState<RunMode | null>(null);
  const [activeTrace, setActiveTrace] = useState<TraceSource>("agent");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

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

  const callApi = async <T,>(
    path: string,
    payload: { message: string }
  ): Promise<T> => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json();
  };

  const runLlm = async () => {
    setLoading("LLM");
    setExpandedCards(new Set());
    try {
      const data = await callApi<LlmTestResponse>("/api/llm-test/run", {
        message,
      });
      setLlmResult(data);
      setActiveTrace("llm");
    } finally {
      setLoading(null);
    }
  };

  const runAgent = async () => {
    setLoading("AGENT");
    setExpandedCards(new Set());
    try {
      const path =
        agentVersion === "v1"
          ? "/api/agent-test/run"
          : "/api/agent-test/run-v2";
      const data = await callApi<AgentTestResponse>(path, {
        message,
      });
      setAgentResult(data);
      setLastAgentVersion(agentVersion);
      setActiveTrace("agent");
    } finally {
      setLoading(null);
    }
  };

  const runBoth = async () => {
    setLoading("BOTH");
    setExpandedCards(new Set());
    try {
      const llm = await callApi<LlmTestResponse>("/api/llm-test/run", {
        message,
      });
      setLlmResult(llm);
      const path =
        agentVersion === "v1"
          ? "/api/agent-test/run"
          : "/api/agent-test/run-v2";
      const agent = await callApi<AgentTestResponse>(path, {
        message,
      });
      setAgentResult(agent);
      setLastAgentVersion(agentVersion);
      setActiveTrace("agent");
    } finally {
      setLoading(null);
    }
  };

  const currentTrace = useMemo(() => {
    if (activeTrace === "agent") return agentResult?.trace ?? [];
    return llmResult?.trace ?? [];
  }, [activeTrace, agentResult?.trace, llmResult?.trace]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <div className="bg-gradient-to-r from-indigo-100 to-blue-50 border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-gray-800">
            LLM vs Agent Playground
          </h1>
          <div className="text-xs text-gray-600">
            모델: gpt-4o-mini (server only)
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <textarea
            className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="메시지를 입력하세요"
          />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                onClick={runLlm}
                disabled={!!loading}
              >
                {loading === "LLM" ? "LLM 실행 중..." : "LLM 실행"}
              </button>
              <button
                className="flex-1 bg-emerald-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                onClick={runAgent}
                disabled={!!loading}
              >
                {loading === "AGENT" ? "Agent 실행 중..." : "Agent 실행"}
              </button>
            </div>
            <button
              className="w-full bg-slate-900 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
              onClick={runBoth}
              disabled={!!loading}
            >
              {loading === "BOTH" ? "둘 다 실행 중..." : "둘 다 실행"}
            </button>
            <label className="text-xs text-gray-700">
              Agent 선택: {" "}
              <select
                className="border rounded px-2 py-1 text-xs ml-1"
                value={agentVersion}
                onChange={(e) => setAgentVersion(e.target.value as AgentVersion)}
                disabled={!!loading}
              >
                <option value="v1">Agent v1 (Graph)</option>
                <option value="v2">Agent v2 (Tool-loop)</option>
              </select>
            </label>
            <div className="text-xs text-gray-600 mt-1">
              클라이언트에서는 OpenAI 직접 호출 없이 API를 사용합니다.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">LLM 결과</h2>
            {llmResult && (
              <button
                className={`text-xs px-2 py-1 rounded ${
                  activeTrace === "llm"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100"
                }`}
                onClick={() => setActiveTrace("llm")}
              >
                Trace 보기
              </button>
            )}
          </div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap min-h-[120px]">
            {llmResult?.answer || "아직 실행하지 않았습니다."}
          </div>
        </div>
        <div className="border rounded-xl p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">Agent 결과</h2>
            {agentResult && (
              <button
                className={`text-xs px-2 py-1 rounded ${
                  activeTrace === "agent"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100"
                }`}
                onClick={() => setActiveTrace("agent")}
              >
                Trace 보기
              </button>
            )}
          </div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap min-h-[120px]">
            {agentResult?.answer || "아직 실행하지 않았습니다."}
          </div>
          {agentResult?.meta && (
            <div className="mt-3 text-xs text-gray-600 space-y-1">
              <div>
                실행 버전:{" "}
                {lastAgentVersion === "v1"
                  ? "Agent v1 (Graph)"
                  : "Agent v2 (Tool-loop)"}
              </div>
              {lastAgentVersion === "v1" ? (
                <>
                  <div>
                    계획: {toPreview(String(agentResult.meta.plan || "-"), 80)}
                  </div>
                  <div>
                    검색 쿼리: {String(agentResult.meta.searchQuery ?? "-")}
                  </div>
                  <div>
                    계산:{" "}
                    {String(
                      agentResult.meta.calcResult ??
                        agentResult.meta.calculation ??
                        "-"
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>LLM Steps: {String(agentResult.meta.steps ?? "-")}</div>
                  <div>
                    Tool Calls: {String(agentResult.meta.toolCallsCount ?? "-")}
                  </div>
                  <div className="break-words">
                    Last Tool Results: {String(agentResult.meta.lastToolResults ?? "-")}
                  </div>
                </>
              )}
              <div className="bg-gray-50 p-2 rounded border text-[11px] text-gray-700">
                {JSON.stringify(agentResult.meta, null, 2)}
              </div>
            </div>
          )}
        </div>
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
                activeTrace === "llm"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100"
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
              Agent Trace ({
                lastAgentVersion === "v1" ? "v1 / Graph" : "v2 / Tool-loop"
              })
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
