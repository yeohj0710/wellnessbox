import { z } from "zod";

import { EvaluationResult, NodePrompt } from "./types";

export type AgentContext = {
  input: string;
  scratch: Record<string, any>;
};

export type AgentStep =
  | {
      id: string;
      type: "sequential";
      label: string;
      prompt: (ctx: AgentContext) => NodePrompt;
      saveAs: string;
    }
  | {
      id: string;
      type: "parallel_generate";
      label: string;
      count: number;
      prompt: (ctx: AgentContext, index: number) => NodePrompt;
      saveAs: string;
    }
  | {
      id: string;
      type: "judge";
      label: string;
      from: string;
      prompt: (ctx: AgentContext) => NodePrompt;
      saveAs: string;
    }
  | {
      id: string;
      type: "route";
      label: string;
      prompt: (ctx: AgentContext) => NodePrompt;
      routes: {
        id: string;
        label: string;
        prompt: (ctx: AgentContext) => NodePrompt;
      }[];
      saveAs: string;
    };

export type AgentPlan = {
  steps: AgentStep[];
  finalField: string;
  revision?: {
    targetField?: string;
    maxRetries: number;
    prompt: (ctx: AgentContext, evaluation: EvaluationResult) => NodePrompt;
  };
};

export type PlaygroundPattern = {
  id: string;
  name: string;
  description: string;
  defaultPrompt: string;
  expectedOutputSchema?: z.ZodTypeAny;
  evaluator: (output: string) => EvaluationResult;
  agentPlan: AgentPlan;
};
