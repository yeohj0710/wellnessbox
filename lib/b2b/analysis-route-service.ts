import db from "@/lib/db";
import { computeAndSaveB2bAnalysis } from "@/lib/b2b/analysis-service";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { regenerateB2bReport } from "@/lib/b2b/report-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";

export type AnalysisMutationComputeInput = Omit<
  Parameters<typeof computeAndSaveB2bAnalysis>[0],
  "employeeId" | "periodKey"
>;

export type AnalysisMutationInput = {
  employeeId: string;
  periodKey: string;
  action: string;
  actionPayload: Record<string, unknown>;
  computeInput: AnalysisMutationComputeInput;
};

type AnalysisMutationSaved = Awaited<ReturnType<typeof computeAndSaveB2bAnalysis>>;
type AnalysisMutationReport = Awaited<ReturnType<typeof regenerateB2bReport>>;
type AnalysisLookupRecord = Awaited<ReturnType<typeof db.b2bAnalysisResult.findFirst>>;

type AnalysisMutationResult = {
  saved: AnalysisMutationSaved;
  report: AnalysisMutationReport;
  periodKey: string;
};

type BaseAnalysisMutationBuilderInput = {
  employeeId: string;
  periodKey?: string;
  generateAiEvaluation?: boolean;
};

export type ExternalPayloadMutationBuilderInput = BaseAnalysisMutationBuilderInput & {
  payload: unknown;
};

export type RecomputeMutationBuilderInput = BaseAnalysisMutationBuilderInput & {
  forceAiRegenerate?: boolean;
  externalAnalysisPayload?: unknown;
  replaceLatestPeriodEntry?: boolean;
};

export function collectAnalysisAvailablePeriods(
  periods: Array<{ periodKey: string | null }>
) {
  return [
    ...new Set(
      periods
        .map((row) => row.periodKey)
        .filter((row): row is string => Boolean(row))
    ),
  ];
}

export function summarizeComputedForResponse(computed: Record<string, unknown>) {
  return {
    periodKey:
      typeof computed.periodKey === "string"
        ? computed.periodKey
        : resolveCurrentPeriodKey(),
    summary:
      typeof computed.summary === "object" && computed.summary
        ? computed.summary
        : null,
    trend:
      typeof computed.trend === "object" && computed.trend
        ? computed.trend
        : null,
    aiEvaluation:
      typeof computed.aiEvaluation === "object" && computed.aiEvaluation
        ? computed.aiEvaluation
        : null,
  };
}

export function serializeAnalysisMutationResult(input: AnalysisMutationResult) {
  const { saved, report, periodKey } = input;
  return {
    ok: true,
    analysis: {
      id: saved.analysis.id,
      version: saved.analysis.version,
      reportCycle: saved.analysis.reportCycle ?? null,
      updatedAt: saved.analysis.updatedAt.toISOString(),
      ...summarizeComputedForResponse(saved.computed as Record<string, unknown>),
    },
    report: {
      id: report.id,
      variantIndex: report.variantIndex,
      status: report.status,
      periodKey: report.periodKey ?? periodKey,
      updatedAt: report.updatedAt.toISOString(),
    },
  };
}

export function serializeAnalysisLookupRecord(latest: AnalysisLookupRecord) {
  if (!latest) return null;
  return {
    id: latest.id,
    version: latest.version,
    periodKey: latest.periodKey ?? null,
    reportCycle: latest.reportCycle ?? null,
    payload: latest.payload,
    computedAt: latest.computedAt?.toISOString() ?? null,
    updatedAt: latest.updatedAt.toISOString(),
  };
}

export async function loadAdminAnalysisLookup(
  employeeId: string,
  requestedPeriodKey: string | null
) {
  const [latest, periods] = await Promise.all([
    db.b2bAnalysisResult.findFirst({
      where: {
        employeeId,
        ...(requestedPeriodKey ? { periodKey: requestedPeriodKey } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
    }),
    db.b2bAnalysisResult.findMany({
      where: { employeeId, periodKey: { not: null } },
      orderBy: [{ periodKey: "desc" }, { version: "desc" }],
      select: { periodKey: true },
      take: 24,
    }),
  ]);

  return {
    analysis: serializeAnalysisLookupRecord(latest),
    periodKey:
      requestedPeriodKey || latest?.periodKey || resolveCurrentPeriodKey(),
    availablePeriods: collectAnalysisAvailablePeriods(periods),
  };
}

export function buildExternalPayloadUpsertMutation(
  input: ExternalPayloadMutationBuilderInput
): AnalysisMutationInput {
  const periodKey = input.periodKey ?? resolveCurrentPeriodKey();
  return {
    employeeId: input.employeeId,
    periodKey,
    action: "analysis_external_payload_upsert",
    actionPayload: {
      generateAiEvaluation: input.generateAiEvaluation === true,
    },
    computeInput: {
      externalAnalysisPayload: input.payload,
      replaceLatestPeriodEntry: true,
      generateAiEvaluation: input.generateAiEvaluation,
    },
  };
}

export function buildRecomputeMutation(
  input: RecomputeMutationBuilderInput
): AnalysisMutationInput {
  const periodKey = input.periodKey ?? resolveCurrentPeriodKey();
  return {
    employeeId: input.employeeId,
    periodKey,
    action: "analysis_recompute",
    actionPayload: {
      generateAiEvaluation: input.generateAiEvaluation === true,
      forceAiRegenerate: input.forceAiRegenerate === true,
    },
    computeInput: {
      generateAiEvaluation: input.generateAiEvaluation,
      forceAiRegenerate: input.forceAiRegenerate,
      externalAnalysisPayload: input.externalAnalysisPayload,
      replaceLatestPeriodEntry: input.replaceLatestPeriodEntry,
    },
  };
}

export async function runAdminAnalysisMutation(input: AnalysisMutationInput) {
  const saved = await computeAndSaveB2bAnalysis({
    employeeId: input.employeeId,
    periodKey: input.periodKey,
    ...input.computeInput,
  });
  const report = await regenerateB2bReport({
    employeeId: input.employeeId,
    periodKey: input.periodKey,
    pageSize: "A4",
    recomputeAnalysis: false,
    generateAiEvaluation: input.computeInput.generateAiEvaluation,
  });

  await logB2bAdminAction({
    employeeId: input.employeeId,
    action: input.action,
    actorTag: "admin",
    payload: {
      analysisId: saved.analysis.id,
      periodKey: input.periodKey,
      ...input.actionPayload,
    },
  });

  return { saved, report, periodKey: input.periodKey };
}
