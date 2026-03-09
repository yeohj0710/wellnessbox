import {
  PlaygroundMode,
  PlaygroundRunResult,
  TraceEvent,
} from "@/lib/agent-playground/types";

export type AgentPlaygroundActiveTrace = "llm" | "agent";

export type PlaygroundEvaluation = {
  pass?: boolean;
  violations?: string[];
  score?: number;
};

export function toTracePreview(text?: string, max = 120) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function extractEvaluation(
  result: PlaygroundRunResult | null | undefined
): PlaygroundEvaluation | undefined {
  const evaluation = result?.meta?.["evaluation"];
  if (!evaluation || typeof evaluation !== "object") return undefined;
  return evaluation as PlaygroundEvaluation;
}

export function resolveCurrentTrace(
  activeTrace: AgentPlaygroundActiveTrace,
  llmResult: PlaygroundRunResult | null,
  agentResult: PlaygroundRunResult | null
): TraceEvent[] {
  return activeTrace === "llm"
    ? llmResult?.trace || []
    : agentResult?.trace || [];
}

export function buildComparisonSummary(
  llmEval?: PlaygroundEvaluation,
  agentEval?: PlaygroundEvaluation
) {
  if (!llmEval && !agentEval) return "";

  const llmScore = (llmEval?.score ?? 0) + (llmEval?.pass ? 1 : 0);
  const agentScore = (agentEval?.score ?? 0) + (agentEval?.pass ? 1.5 : 0);

  if (agentEval?.pass && !llmEval?.pass) {
    return "Agent가 제약 조건을 더 안정적으로 만족했고, LLM 응답은 기준을 통과하지 못했습니다.";
  }

  if (agentEval?.pass === llmEval?.pass) {
    if (agentScore > llmScore) {
      return "Agent 출력이 조건 충족도와 평가 점수에서 더 유리했습니다.";
    }
    if (agentScore < llmScore) {
      return "LLM 출력이 이번 비교에서는 더 높은 평가 점수를 보였습니다.";
    }
  }

  if (!agentEval?.pass && llmEval?.pass) {
    return "LLM은 통과했지만 agent 워크플로에는 추가 조정이 필요합니다.";
  }

  return "Agent가 제약을 만족하는 방향에 더 가깝게 수렴했습니다.";
}

export function getRunButtonLabel(
  mode: PlaygroundMode,
  loading: PlaygroundMode | null
) {
  if (loading === mode) {
    if (mode === "llm") return "LLM 실행 중...";
    if (mode === "agent") return "Agent 실행 중...";
    return "비교 실행 중...";
  }

  if (mode === "llm") return "LLM 실행";
  if (mode === "agent") return "Agent 실행";
  return "둘 다 실행";
}
