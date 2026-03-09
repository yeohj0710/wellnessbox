"use client";

import { TraceEvent } from "@/lib/agent-playground/types";

import { AgentPlaygroundActiveTrace } from "../_lib/agent-playground-page-model";
import { AgentPlaygroundTraceCard } from "./AgentPlaygroundTraceCard";

type AgentPlaygroundTraceTimelineProps = {
  activeTrace: AgentPlaygroundActiveTrace;
  currentTrace: TraceEvent[];
  expandedCards: Set<number>;
  hasAgentTrace: boolean;
  hasLlmTrace: boolean;
  onActiveTraceChange: (trace: AgentPlaygroundActiveTrace) => void;
  onToggleCard: (index: number) => void;
};

export function AgentPlaygroundTraceTimeline({
  activeTrace,
  currentTrace,
  expandedCards,
  hasAgentTrace,
  hasLlmTrace,
  onActiveTraceChange,
  onToggleCard,
}: AgentPlaygroundTraceTimelineProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Trace Timeline</h3>
          <p className="text-xs text-gray-600">
            카드를 클릭하면 상세 JSON을 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={`rounded px-3 py-1 text-xs ${
              activeTrace === "llm" ? "bg-indigo-600 text-white" : "bg-gray-100"
            }`}
            onClick={() => onActiveTraceChange("llm")}
            disabled={!hasLlmTrace}
          >
            LLM Trace
          </button>
          <button
            className={`rounded px-3 py-1 text-xs ${
              activeTrace === "agent"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100"
            }`}
            onClick={() => onActiveTraceChange("agent")}
            disabled={!hasAgentTrace}
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
            <AgentPlaygroundTraceCard
              key={`${event.type}-${idx}`}
              event={event}
              index={idx}
              expanded={expandedCards.has(idx)}
              onToggle={onToggleCard}
            />
          ))}
        </div>
      )}
    </div>
  );
}
