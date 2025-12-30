import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel, getOpenAIApiKey } from "./openai";
import { createCalculatorTool, createSearchDocsTool } from "./tools";
import { TraceCollector } from "./trace";
import {
  PlaygroundMode,
  PlaygroundResponse,
  PlaygroundRunResult,
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

const runLlm = async (message: string): Promise<PlaygroundRunResult> => {
  const tracer = new TraceCollector();
  const llm = createChatModel();

  try {
    const response = await llm.invoke(
      [
        new SystemMessage("간결하게 한국어로 답변하세요."),
        new HumanMessage(message),
      ],
      { callbacks: [tracer as any] }
    );

    const answer = safeAnswer(response.content);
    return { answer, trace: tracer.trace };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "LLM 호출 중 오류가 발생했습니다.";
    tracer.pushError(errorMessage);
    return { error: errorMessage, trace: tracer.trace };
  }
};

const runAgent = async (message: string): Promise<PlaygroundRunResult> => {
  const tracer = new TraceCollector();
  const llm = createChatModel();
  const tools = [createCalculatorTool(), createSearchDocsTool()];
  const modelWithTools = llm.bindTools(tools);

  const messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
    new SystemMessage(
      "사용자의 질문에 답하기 위해 필요한 경우 제공된 도구를 호출하세요. 계산은 calculator, 문맥 검색은 searchDocs를 사용합니다. 모든 최종 답변은 한국어로 작성합니다."
    ),
    new HumanMessage(message),
  ];

  try {
    let finalAnswer: string | undefined;

    for (let step = 0; step < 6; step += 1) {
      const aiMessage = (await modelWithTools.invoke(messages, {
        callbacks: [tracer as any],
      })) as AIMessage;

      messages.push(aiMessage);

      const toolCalls = aiMessage.tool_calls ?? [];
      if (toolCalls.length === 0) {
        finalAnswer = safeAnswer(aiMessage.content);
        break;
      }

      for (const call of toolCalls) {
        const tool = tools.find((t) => t.name === call.name);
        if (!tool) {
          tracer.pushError(`등록되지 않은 도구: ${call.name}`);
          continue;
        }

        try {
          const output = await (tool as any).invoke(call.args as any, {
            callbacks: [tracer as any],
          });
          messages.push(
            new ToolMessage({
              content: typeof output === "string" ? output : JSON.stringify(output),
              tool_call_id: call.id ?? call.name,
              name: call.name,
            })
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error ?? "도구 오류");
          tracer.pushError(errorMessage);
          messages.push(
            new ToolMessage({
              content: `도구 오류: ${errorMessage}`,
              tool_call_id: call.id ?? call.name,
              name: call.name,
            })
          );
        }
      }
    }

    const trace = tracer.trace;
    const toolCalls = trace.filter((t) => t.type === "TOOL_CALL");
    const llmCalls = trace.filter((t) => t.type === "LLM_CALL");

    return {
      answer: finalAnswer ?? "응답이 생성되지 않았습니다.",
      trace,
      meta: {
        toolCalls: toolCalls.length,
        llmCalls: llmCalls.length,
        toolsUsed: Array.from(new Set(toolCalls.map((t) => t.name).filter(Boolean))),
        lastToolOutput: toolCalls.at(-1)?.outputPreview,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "agent 실행 중 오류가 발생했습니다.";
    tracer.pushError(errorMessage);
    return { error: errorMessage, trace: tracer.trace };
  }
};

export const runPlayground = async (
  message: string,
  mode: PlaygroundMode
): Promise<PlaygroundResponse> => {
  const modeParsed = modeSchema.safeParse(mode);
  if (!modeParsed.success) {
    return { error: "mode must be one of llm | agent | both" };
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return { error: "message is required" };
  }

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    const payload = buildErrorResult("OpenAI API key가 설정되지 않았습니다.");
    return {
      error: payload.error,
      llm: mode !== "agent" ? payload : undefined,
      agent: mode !== "llm" ? payload : undefined,
    };
  }

  const response: PlaygroundResponse = {};

  if (modeParsed.data === "llm" || modeParsed.data === "both") {
    response.llm = await runLlm(message);
  }

  if (modeParsed.data === "agent" || modeParsed.data === "both") {
    response.agent = await runAgent(message);
  }

  return response;
};
