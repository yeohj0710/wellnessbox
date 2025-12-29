export type TraceEventType = "LLM_CALL" | "NODE_START" | "NODE_END" | "TOOL_CALL";

export type TraceEvent = {
  type: TraceEventType;
  name?: string;
  ms: number;
  inputPreview?: string;
  outputPreview?: string;
  decisionReason?: string;
  meta?: Record<string, unknown>;
};

export type LlmTestResponse = {
  answer: string;
  trace: TraceEvent[];
};

export type AgentTestResponse = {
  answer: string;
  trace: TraceEvent[];
  meta?: Record<string, unknown>;
};
