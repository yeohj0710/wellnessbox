import { TraceEvent } from "../types";

const preview = (text: string, max = 200) => (text.length > max ? `${text.slice(0, max)}...` : text);

const isSafeExpression = (expr: string) => /^[0-9+\-*/().\s]+$/.test(expr);

export const evaluateExpression = (expression: string, existingTrace: TraceEvent[]): { result: string; trace: TraceEvent[] } => {
  const start = Date.now();
  const trimmed = expression.trim();
  let result = "";

  if (!isSafeExpression(trimmed)) {
    result = "지원하지 않는 표현식입니다.";
  } else {
    try {
      // eslint-disable-next-line no-new-func
      const value = Function(`"use strict"; return (${trimmed})`)();
      result = Number.isFinite(value) ? String(value) : "계산 실패";
    } catch (error) {
      result = "계산 중 오류가 발생했습니다.";
    }
  }

  const duration = Date.now() - start;
  const toolEvent: TraceEvent = {
    type: "TOOL_CALL",
    name: "calculator",
    ms: duration,
    inputPreview: preview(trimmed),
    outputPreview: preview(result),
  };

  return { result, trace: [...existingTrace, toolEvent] };
};
