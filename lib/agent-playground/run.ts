import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel, getOpenAIApiKey } from "./openai";
import { getPattern } from "./patterns";
import { runAgentPattern } from "./engine";
import { TraceCollector } from "./trace";
import {
  PlaygroundMode,
  PlaygroundResponse,
  PlaygroundRunResult,
  playgroundRequestSchema,
} from "./types";

const modeSchema = z.enum(["llm", "agent", "both"]);

const safeAnswer = (content: unknown) =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content
          .map((item) =>
            typeof item === "string" ? item : JSON.stringify(item ?? "")
          )
          .join(" ")
      : JSON.stringify(content ?? "");

const buildErrorResult = (message: string): PlaygroundRunResult => ({
  error: message,
  trace: [
    {
      type: "ERROR",
      ms: 0,
      errorMessage: message,
    },
  ],
});

const runLlm = async (
  message: string,
  patternId?: string
): Promise<PlaygroundRunResult> => {
  const tracer = new TraceCollector();
  const llm = createChatModel();
  const pattern = getPattern(patternId);

  try {
    const response = await llm.invoke(
      [
        new SystemMessage("요구사항을 지키며 간결하게 한국어로 작성하세요."),
        new HumanMessage(message),
      ],
      { callbacks: [tracer as any], metadata: { nodeName: "baseline" } }
    );

    const answer = safeAnswer(response.content);
    const evaluation = pattern.evaluator(answer);
    const llmCalls = tracer.trace.filter((t) => t.type === "LLM_CALL").length;
    return { answer, trace: tracer.trace, meta: { evaluation, patternId, llmCalls } };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "LLM 호출 중 오류가 발생했습니다.";
    tracer.pushError(errorMessage);
    return { error: errorMessage, trace: tracer.trace };
  }
};

export const runPlayground = async (
  message: string | undefined,
  mode: PlaygroundMode,
  patternId?: string
): Promise<PlaygroundResponse> => {
  const modeParsed = modeSchema.safeParse(mode);
  if (!modeParsed.success) {
    return { error: "mode must be one of llm | agent | both" };
  }

  const pattern = getPattern(patternId);
  const resolvedPrompt = message?.trim() ? message : pattern.defaultPrompt;
  if (!resolvedPrompt) {
    return { error: "message is required" };
  }

  const requestValidation = playgroundRequestSchema.safeParse({
    message: resolvedPrompt,
    mode,
    patternId,
  });

  if (!requestValidation.success) {
    return { error: "invalid request" };
  }

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    const payload = buildErrorResult("OpenAI API key가 설정되지 않았습니다.");
    return {
      error: payload.error,
      llm: mode !== "agent" ? payload : undefined,
      agent: mode !== "llm" ? payload : undefined,
      patternId: pattern.id,
    };
  }

  const response: PlaygroundResponse = { patternId: pattern.id };

  if (modeParsed.data === "llm" || modeParsed.data === "both") {
    response.llm = await runLlm(resolvedPrompt, pattern.id);
  }

  if (modeParsed.data === "agent" || modeParsed.data === "both") {
    response.agent = await runAgentPattern(pattern, resolvedPrompt);
  }

  return response;
};
