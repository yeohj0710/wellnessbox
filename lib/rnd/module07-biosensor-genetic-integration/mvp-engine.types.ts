import type {
  RndModule07AlgorithmAdjustment,
  RndModule07CgmMetric,
  RndModule07DataLakeWriteLog,
  RndModule07DataSource,
  RndModule07GeneticVariant,
  RndModule07IntegrationOutput,
  RndModule07IntegrationSession,
  RndModule07WearableMetric,
} from "./contracts";
import type {
  RndDataLakeRecord,
  RndDataSensitivity,
  RndModule02SourceKind,
} from "../module02-data-lake/contracts";
import { MODULE07_MVP_PHASE } from "./mvp-engine.shared";
import { RND_MODULE_07_NAME } from "./contracts";

export type Module07MvpRuntimeLog = {
  logId: string;
  sessionId: string | null;
  module: typeof RND_MODULE_07_NAME;
  phase: typeof MODULE07_MVP_PHASE;
  stage: "input_validation" | "normalization" | "linkage" | "output_build";
  event: string;
  details: Record<string, string | number | boolean | null>;
  loggedAt: string;
};

export type Module07MvpWiringLog = {
  wiringLogId: string;
  sessionId: string;
  source: RndModule07DataSource;
  dataLakeRecordId: string | null;
  sourceKind: RndModule02SourceKind;
  sensitivity: RndDataSensitivity;
  linked: boolean;
  reason: string;
  metricCount: number;
  variantCount: number;
  adjustmentCount: number;
  loggedAt: string;
};

export type RunModule07IntegrationMvpInput = {
  sessions: RndModule07IntegrationSession[];
  wearableMetrics: RndModule07WearableMetric[];
  cgmMetrics: RndModule07CgmMetric[];
  geneticVariants: RndModule07GeneticVariant[];
  algorithmAdjustments: RndModule07AlgorithmAdjustment[];
  dataLakeWriteLogs: RndModule07DataLakeWriteLog[];
  generatedAt?: string;
  runId?: string;
};

export type RunModule07IntegrationMvpResult = {
  module: typeof RND_MODULE_07_NAME;
  phase: typeof MODULE07_MVP_PHASE;
  generatedAt: string;
  output: RndModule07IntegrationOutput;
  normalizedRecords: RndDataLakeRecord[];
  wiringLogs: Module07MvpWiringLog[];
  runtimeLogs: Module07MvpRuntimeLog[];
};
