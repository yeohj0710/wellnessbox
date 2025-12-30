import { z } from "zod";

export type TraceEventType = "LLM_CALL" | "TOOL_CALL" | "ERROR" | "STEP";

export type TraceEvent = {
  type: TraceEventType;
  name?: string;
  ms: number;
  inputPreview?: string;
  outputPreview?: string;
  errorMessage?: string;
  meta?: Record<string, unknown>;
};

export type EvaluationResult = {
  pass: boolean;
  score?: number;
  violations: string[];
  parsed?: unknown;
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
  patternId?: string;
  error?: string;
};

export type PlaygroundMode = "llm" | "agent" | "both";

export type NodePrompt = {
  system?: string;
  human: string;
};

export type PlaygroundRequest = z.infer<typeof playgroundRequestSchema>;

export const playgroundRequestSchema = z.object({
  message: z.string().optional(),
  mode: z.enum(["llm", "agent", "both"]),
  patternId: z.string().optional(),
});
