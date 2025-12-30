import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { BaseMessage } from "@langchain/core/messages";

import { TraceEvent } from "./types";

const joinMessageContent = (messages: any[]) =>
  messages
    .map((msg) => {
      const content = (msg as BaseMessage)?.content ?? (msg as any)?.text;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((chunk) =>
            typeof chunk === "string"
              ? chunk
              : typeof chunk.text === "string"
                ? chunk.text
                : ""
          )
          .filter(Boolean)
          .join(" ")
          .trim();
      }
      return String(content ?? "");
    })
    .filter(Boolean)
    .join(" | ");

export const preview = (text?: string, max = 180) => {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
};

type PendingRun = {
  start: number;
  name?: string;
  inputPreview?: string;
  meta?: Record<string, unknown>;
};

export class TraceCollector extends BaseCallbackHandler {
  name = "agent-playground-trace";

  private llmRuns = new Map<string, PendingRun>();

  private toolRuns = new Map<string, PendingRun>();

  private events: TraceEvent[] = [];

  get trace() {
    return this.events;
  }

  handleLLMStart(
    _llm: unknown,
    prompts: any[],
    runId: string,
    _parentRunId?: string,
    extraParams?: Record<string, unknown>
  ) {
    const modelName =
      (extraParams as any)?.invocation_params?.model ?? (extraParams as any)?.name;
    this.llmRuns.set(runId, {
      start: Date.now(),
      name: (extraParams as any)?.metadata?.nodeName ?? modelName,
      meta: (extraParams as any)?.metadata,
      inputPreview: preview(joinMessageContent(prompts as BaseMessage[])),
    });
  }

  handleLLMEnd(output: unknown, runId: string) {
    const pending = this.llmRuns.get(runId);
    this.llmRuns.delete(runId);

    const outputPreview = preview(
      (output as any)?.generations?.[0]?.[0]?.text ??
        (output as any)?.generations?.[0]?.[0]?.message?.content ??
        (output as any)?.output_text ??
        (output as any)?.text ??
        (output as any)?.message?.content ??
        (typeof output === "string" ? output : JSON.stringify(output))
    );

    this.events.push({
      type: "LLM_CALL",
      name: pending?.name,
      ms: Date.now() - (pending?.start ?? Date.now()),
      inputPreview: pending?.inputPreview,
      outputPreview,
      meta: pending?.meta,
    });
  }

  handleLLMError(error: unknown, runId: string) {
    const pending = this.llmRuns.get(runId);
    this.llmRuns.delete(runId);
    this.events.push({
      type: "ERROR",
      name: pending?.name ?? "llm",
      ms: Date.now() - (pending?.start ?? Date.now()),
      inputPreview: pending?.inputPreview,
      errorMessage: error instanceof Error ? error.message : String(error),
      meta: pending?.meta,
    });
  }

  handleToolStart(tool: unknown, input: unknown, runId: string) {
    const toolInput =
      typeof input === "string"
        ? input
        : Array.isArray(input)
          ? input.join(" ")
          : JSON.stringify(input);
    this.toolRuns.set(runId, {
      start: Date.now(),
      name: (tool as any)?.name,
      inputPreview: preview(toolInput),
    });
  }

  handleToolEnd(output: unknown, runId: string) {
    const pending = this.toolRuns.get(runId);
    this.toolRuns.delete(runId);
    this.events.push({
      type: "TOOL_CALL",
      name: pending?.name,
      ms: Date.now() - (pending?.start ?? Date.now()),
      inputPreview: pending?.inputPreview,
      outputPreview: preview(
        typeof output === "string" ? output : JSON.stringify(output)
      ),
    });
  }

  handleToolError(error: unknown, runId: string) {
    const pending = this.toolRuns.get(runId);
    this.toolRuns.delete(runId);
    this.events.push({
      type: "ERROR",
      name: pending?.name ?? "tool",
      ms: Date.now() - (pending?.start ?? Date.now()),
      inputPreview: pending?.inputPreview,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

  pushStep(name: string, meta?: Record<string, unknown>) {
    this.events.push({
      type: "STEP",
      name,
      ms: 0,
      meta,
    });
  }

  pushError(message: string) {
    this.events.push({ type: "ERROR", ms: 0, errorMessage: message });
  }
}
