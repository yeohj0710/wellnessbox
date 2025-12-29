import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "../openai";
import { evaluateExpression } from "../tools/calculator";
import { searchDocs } from "../tools/searchDocs";
import { AgentTestResponse, TraceEvent } from "../types";

const model = createChatModel();

const preview = (text: string, max = 200) =>
  text.length > max ? `${text.slice(0, max)}...` : text;

const decisionSystemPrompt = `당신은 도구를 선택하여 문제를 해결하는 에이전트입니다.
항상 아래 JSON 포맷 중 하나만 출력하세요. 절대 JSON 외 다른 내용을 추가하지 마세요.
1) {"action":"tool","tool":"searchDocs","input":{"query":"..."},"reason":"..."}
2) {"action":"tool","tool":"calculator","input":{"expression":"..."},"reason":"..."}
3) {"action":"final","answer":"..."}
검색은 짧은 키워드로, 계산은 숫자/기호만 사용하세요.`;

type ToolAction =
  | {
      action: "tool";
      tool: "searchDocs";
      input: { query: string };
      reason?: string;
    }
  | {
      action: "tool";
      tool: "calculator";
      input: { expression: string };
      reason?: string;
    }
  | { action: "final"; answer: string; reason?: string };

const extractFirstJsonObject = (raw: string) => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
};

const parseAction = (raw: string): ToolAction | null => {
  const jsonText = extractFirstJsonObject(raw) ?? raw;

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }

  // 정석: { action:"tool", tool:"searchDocs" | "calculator", input:{...} }
  if (parsed?.action === "tool" && parsed.tool === "searchDocs") {
    return {
      action: "tool",
      tool: "searchDocs",
      input: { query: String(parsed.input?.query ?? "") },
      reason: parsed.reason ? String(parsed.reason) : undefined,
    };
  }
  if (parsed?.action === "tool" && parsed.tool === "calculator") {
    return {
      action: "tool",
      tool: "calculator",
      input: { expression: String(parsed.input?.expression ?? "") },
      reason: parsed.reason ? String(parsed.reason) : undefined,
    };
  }

  // 흔한 변형: { action:"searchDocs" | "calculator", input:{...} } -> tool로 정규화
  if (parsed?.action === "searchDocs") {
    return {
      action: "tool",
      tool: "searchDocs",
      input: { query: String(parsed.input?.query ?? "") },
      reason: parsed.reason ? String(parsed.reason) : undefined,
    };
  }
  if (parsed?.action === "calculator") {
    return {
      action: "tool",
      tool: "calculator",
      input: { expression: String(parsed.input?.expression ?? "") },
      reason: parsed.reason ? String(parsed.reason) : undefined,
    };
  }

  // final
  if (parsed?.action === "final") {
    return {
      action: "final",
      answer: String(parsed.answer ?? ""),
      reason: parsed.reason ? String(parsed.reason) : undefined,
    };
  }

  return null;
};

export const runAgenticToolLoopV2 = async (
  message: string
): Promise<AgentTestResponse> => {
  let trace: TraceEvent[] = [];
  let answer: string | undefined;
  const lastToolResults: string[] = [];
  let toolCallsCount = 0;

  for (let step = 1; step <= 6; step += 1) {
    const start = Date.now();
    const recentTool = lastToolResults.at(-1) ?? "최근 도구 결과 없음";

    const response = await model.invoke([
      new SystemMessage(decisionSystemPrompt),
      new HumanMessage(`사용자 메시지: ${message}`),
      new HumanMessage(`가장 최근 도구 결과: ${recentTool}`),
    ]);

    const rawOutput =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = parseAction(rawOutput);

    const llmEvent: TraceEvent = {
      type: "LLM_CALL",
      name: `v2_decision_step${step}`,
      ms: Date.now() - start,
      inputPreview: preview(step === 1 ? message : recentTool),
      outputPreview: preview(rawOutput),
      decisionReason: parsed?.reason,
    };

    trace = [...trace, llmEvent];

    if (!parsed) {
      trace = [
        ...trace,
        {
          type: "ERROR",
          name: `decision_step${step}`,
          ms: 0,
          inputPreview: preview(rawOutput),
          errorMessage: "LLM 응답을 JSON으로 파싱하지 못했습니다.",
        },
      ];
      answer =
        "LLM 응답을 JSON으로 파싱하지 못했습니다. 간단한 답변으로 종료합니다.";
      break;
    }

    if (parsed.action === "final") {
      answer = parsed.answer || "빈 응답";
      break;
    }

    if (parsed.action === "tool" && parsed.tool === "searchDocs") {
      const query = parsed.input.query || message;
      const { snippets, trace: updatedTrace } = await searchDocs(query, trace);
      trace = updatedTrace;
      lastToolResults.push(
        `검색(${query}): ${snippets.join(" | ") || "검색 결과가 없습니다."}`
      );
      toolCallsCount += 1;
      continue;
    }

    if (parsed.action === "tool" && parsed.tool === "calculator") {
      const expression = parsed.input.expression || message;
      const { result, trace: updatedTrace } = evaluateExpression(
        expression,
        trace
      );
      trace = updatedTrace;
      lastToolResults.push(`계산(${expression}): ${result}`);
      toolCallsCount += 1;
      continue;
    }

    trace = [
      ...trace,
      {
        type: "ERROR",
        name: `decision_step${step}`,
        ms: 0,
        inputPreview: preview(rawOutput),
        errorMessage: "알 수 없는 도구 요청입니다.",
      },
    ];
    answer = "알 수 없는 도구 요청으로 중단되었습니다.";
    break;
  }

  if (!answer) {
    const recent = lastToolResults.at(-1);
    answer = recent
      ? `최대 단계에 도달했습니다. 마지막 도구 결과를 요약합니다: ${recent}`
      : "최대 단계에 도달했지만 결정된 응답이 없습니다.";
  }

  return {
    answer,
    trace,
    meta: {
      steps: trace.filter((t) => t.type === "LLM_CALL").length,
      toolCallsCount,
      lastToolResults,
    },
  };
};
