import type {
  RndModule05OptimizationInput,
  RndModule05OptimizationOutput,
  RndModule05TraceLog,
} from "./contracts";

export type Module05ScaffoldBundle = {
  generatedAt: string;
  optimizationInput: RndModule05OptimizationInput;
  optimizationOutput: RndModule05OptimizationOutput;
  traceLogs: RndModule05TraceLog[];
};
