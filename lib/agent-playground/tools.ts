import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

import { mockDocs } from "./docs";
import { preview } from "./trace";

const isSafeExpression = (expr: string) => /^[0-9+\-*/().\s]+$/.test(expr);

const evaluate = (expression: string) => {
  const trimmed = expression.trim();
  if (!trimmed) return "빈 표현식입니다.";
  if (!isSafeExpression(trimmed)) return "허용되지 않은 기호가 포함되어 있습니다.";

  try {
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict"; return (${trimmed})`)();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return "계산 결과를 이해할 수 없습니다.";
  } catch {
    return "계산 중 오류가 발생했습니다.";
  }
};

export const createCalculatorTool = () =>
  new DynamicStructuredTool({
    name: "calculator",
    description:
      "덧셈, 뺄셈, 곱셈, 나눗셈 및 괄호가 포함된 간단한 산술식을 평가합니다.",
    schema: z.object({
      expression: z
        .string()
        .describe("예: 12 * (3 + 5)")
        .max(120, "표현식이 너무 깁니다."),
    }),
    func: async ({ expression }) => {
      const result = evaluate(expression);
      return `expression=${preview(expression)} => ${result}`;
    },
  });

export const createSearchDocsTool = () =>
  new DynamicStructuredTool({
    name: "searchDocs",
    description: "내부 mockDocs에서 키워드를 검색해 관련 문장을 반환합니다.",
    schema: z.object({
      query: z.string().describe("검색 키워드 2~3개").max(120, "쿼리가 너무 깁니다."),
      topK: z.number().min(1).max(5).optional(),
    }),
    func: async ({ query, topK }) => {
      const normalized = query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      const matched = mockDocs.filter((doc) =>
        normalized.some((kw) => doc.toLowerCase().includes(kw))
      );

      const results = (matched.length ? matched : mockDocs).slice(0, topK || 3);

      if (!results.length) {
        return "검색 결과가 없습니다.";
      }

      return results.join(" | ");
    },
  });
