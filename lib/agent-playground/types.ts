export type TraceEventType = "LLM_CALL" | "TOOL_CALL" | "ERROR";

export type TraceEvent = {
  type: TraceEventType;
  name?: string;
  ms: number;
  inputPreview?: string;
  outputPreview?: string;
  errorMessage?: string;
  meta?: Record<string, unknown>;
};

export type PlaygroundRunResult = {
  answer?: string;
  trace: TraceEvent[];
  meta?: Record<string, unknown>;
  error?: string;
};

export type PlaygroundResponse = {
  llm?: PlaygroundRunResult;
  agent?: PlaygroundRunResult;
  error?: string;
};

export type PlaygroundMode = "llm" | "agent" | "both";
