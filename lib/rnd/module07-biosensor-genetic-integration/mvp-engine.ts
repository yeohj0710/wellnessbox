// RND: Module 07 Biosensor and genetic integration MVP deterministic wiring runtime.

import {
  RND_MODULE_07_DATA_SOURCES,
  RND_MODULE_07_NAME,
  RND_MODULE_07_SCHEMA_VERSION,
  assertRndModule07AlgorithmAdjustment,
  assertRndModule07CgmMetric,
  assertRndModule07DataLakeWriteLog,
  assertRndModule07GeneticVariant,
  assertRndModule07IntegrationOutput,
  assertRndModule07IntegrationSession,
  assertRndModule07WearableMetric,
  type RndModule07AlgorithmAdjustment,
  type RndModule07CgmMetric,
  type RndModule07DataLakeWriteLog,
  type RndModule07DataSource,
  type RndModule07GeneticVariant,
  type RndModule07IntegrationOutput,
  type RndModule07IntegrationSession,
  type RndModule07SourceSummary,
  type RndModule07WearableMetric,
} from "./contracts";
import {
  assertRndDataLakeRecord,
  createRndDataLakeRecord,
  type RndDataLakeRecord,
  type RndDataSensitivity,
  type RndEvidenceUnit,
  type RndLineageStep,
  type RndModule02SourceKind,
} from "../module02-data-lake/contracts";

const MODULE07_MVP_PHASE = "MVP" as const;
const MODULE07_MVP_RUN_ID_PREFIX = "rnd07-mvp-run" as const;

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

type Module07SessionArtifacts = {
  payload: Record<string, unknown>;
  metricIds: string[];
  variantIds: string[];
  adjustmentIds: string[];
  metricCount: number;
  variantCount: number;
  adjustmentCount: number;
};

function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

function toRate(successfulSessions: number, totalSessions: number): number {
  if (totalSessions <= 0) return 0;
  return Number(((successfulSessions / totalSessions) * 100).toFixed(2));
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function buildRunId(generatedAt: string): string {
  const token = generatedAt.replace(/[^0-9]/g, "");
  return `${MODULE07_MVP_RUN_ID_PREFIX}-${token}`;
}

function mapSourceToModule02SourceKind(
  source: RndModule07DataSource
): RndModule02SourceKind {
  switch (source) {
    case "wearable":
      return "internal_behavior";
    case "continuous_glucose":
      return "internal_behavior";
    case "genetic_test":
      return "internal_profile";
    default: {
      const _exhaustiveCheck: never = source;
      throw new Error(`Unsupported Module 07 source: ${_exhaustiveCheck}`);
    }
  }
}

function mapSourceToSensitivity(source: RndModule07DataSource): RndDataSensitivity {
  return source === "genetic_test" ? "sensitive" : "internal";
}

function groupBySessionId<T extends { sessionId: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const existing = map.get(row.sessionId) ?? [];
    existing.push(row);
    map.set(row.sessionId, existing);
  }
  return map;
}

function groupAdjustmentsByUserId(
  rows: RndModule07AlgorithmAdjustment[]
): Map<string, RndModule07AlgorithmAdjustment[]> {
  const map = new Map<string, RndModule07AlgorithmAdjustment[]>();
  for (const row of rows) {
    const existing = map.get(row.appUserIdHash) ?? [];
    existing.push(row);
    map.set(row.appUserIdHash, existing);
  }
  return map;
}

function sortByKey<T>(rows: T[], selector: (row: T) => string): T[] {
  return [...rows].sort((left, right) =>
    selector(left).localeCompare(selector(right))
  );
}

function buildSourceSummaries(
  sessions: RndModule07IntegrationSession[]
): RndModule07SourceSummary[] {
  return RND_MODULE_07_DATA_SOURCES.map((source) => {
    const sourceSessions = sessions.filter((session) => session.source === source);
    const totalSessions = sourceSessions.length;
    const successfulSessions = sourceSessions.filter(
      (session) => session.status === "success"
    ).length;
    const sampleCount = sourceSessions.reduce(
      (sum, session) => sum + session.recordsAccepted,
      0
    );
    return {
      source,
      totalSessions,
      successfulSessions,
      sampleCount,
      integrationRate: toRate(successfulSessions, totalSessions),
    };
  });
}

function buildSessionArtifacts(
  session: RndModule07IntegrationSession,
  wearableMetricsBySession: Map<string, RndModule07WearableMetric[]>,
  cgmMetricsBySession: Map<string, RndModule07CgmMetric[]>,
  geneticVariantsBySession: Map<string, RndModule07GeneticVariant[]>,
  adjustmentsByUserId: Map<string, RndModule07AlgorithmAdjustment[]>
): Module07SessionArtifacts {
  const wearableMetrics =
    session.source === "wearable"
      ? sortByKey(wearableMetricsBySession.get(session.sessionId) ?? [], (item) => item.metricId)
      : [];
  const cgmMetrics =
    session.source === "continuous_glucose"
      ? sortByKey(cgmMetricsBySession.get(session.sessionId) ?? [], (item) => item.metricId)
      : [];
  const geneticVariants =
    session.source === "genetic_test"
      ? sortByKey(geneticVariantsBySession.get(session.sessionId) ?? [], (item) => item.variantId)
      : [];

  const userAdjustments = sortByKey(
    (adjustmentsByUserId.get(session.appUserIdHash) ?? []).filter(
      (adjustment) => adjustment.source === session.source
    ),
    (item) => item.adjustmentId
  );

  if (session.recordsAccepted > 0) {
    if (session.source === "wearable" && wearableMetrics.length === 0) {
      throw new Error(`Session ${session.sessionId} accepted records but has no wearable metrics.`);
    }
    if (session.source === "continuous_glucose" && cgmMetrics.length === 0) {
      throw new Error(`Session ${session.sessionId} accepted records but has no CGM metrics.`);
    }
    if (session.source === "genetic_test" && geneticVariants.length === 0) {
      throw new Error(`Session ${session.sessionId} accepted records but has no genetic variants.`);
    }
  }

  const metricIds = uniqueSorted([
    ...wearableMetrics.map((metric) => metric.metricId),
    ...cgmMetrics.map((metric) => metric.metricId),
  ]);
  const variantIds = uniqueSorted(geneticVariants.map((variant) => variant.variantId));
  const adjustmentIds = uniqueSorted(userAdjustments.map((adjustment) => adjustment.adjustmentId));

  const payload: Record<string, unknown> = {
    integrationModule: RND_MODULE_07_NAME,
    source: session.source,
    sessionId: session.sessionId,
    appUserIdHash: session.appUserIdHash,
    status: session.status,
    schemaMapped: session.schemaMapped,
    recordsReceived: session.recordsReceived,
    recordsAccepted: session.recordsAccepted,
    metrics: [...wearableMetrics, ...cgmMetrics].map((metric) => ({
      metricId: metric.metricId,
      category: metric.category,
      metricKey: metric.metricKey,
      value: metric.value,
      unit: metric.unit,
      measuredAt: metric.measuredAt,
    })),
    geneticVariants: geneticVariants.map((variant) => ({
      variantId: variant.variantId,
      gene: variant.gene,
      snpId: variant.snpId,
      allele: variant.allele,
      riskLevel: variant.riskLevel,
      interpretation: variant.interpretation,
      parameterWeightDelta: variant.parameterWeightDelta,
      measuredAt: variant.measuredAt,
    })),
    algorithmAdjustments: userAdjustments.map((adjustment) => ({
      adjustmentId: adjustment.adjustmentId,
      kind: adjustment.kind,
      targetKey: adjustment.targetKey,
      value: adjustment.value,
      rationale: adjustment.rationale,
      appliedAt: adjustment.appliedAt,
    })),
  };

  return {
    payload,
    metricIds,
    variantIds,
    adjustmentIds,
    metricCount: metricIds.length,
    variantCount: variantIds.length,
    adjustmentCount: adjustmentIds.length,
  };
}

function buildEvidenceUnits(
  sourceKind: RndModule02SourceKind,
  session: RndModule07IntegrationSession,
  generatedAt: string,
  artifacts: Module07SessionArtifacts
): RndEvidenceUnit[] {
  const unitIds = uniqueSorted([
    ...artifacts.metricIds,
    ...artifacts.variantIds,
    ...artifacts.adjustmentIds,
  ]);
  const resolvedUnitIds = unitIds.length > 0 ? unitIds : [`session:${session.sessionId}`];

  return resolvedUnitIds.map((unitId, index) => {
    return {
      evidenceId: `m07-evidence-${session.sessionId}-${String(index + 1).padStart(3, "0")}`,
      sourceKind,
      sourceRef: `module07:${session.sessionId}`,
      chunk: {
        unitId,
        locator: `session:${session.sessionId}`,
      },
      capturedAt: generatedAt,
    };
  });
}

function buildLineageSteps(
  recordId: string,
  session: RndModule07IntegrationSession,
  evidenceUnits: RndEvidenceUnit[],
  generatedAt: string
): RndLineageStep[] {
  return [
    {
      step: "ingest",
      actor: "module07-mvp",
      occurredAt: generatedAt,
      inputIds: [session.sessionId],
    },
    {
      step: "tag",
      actor: "module07-mvp",
      occurredAt: generatedAt,
      inputIds: evidenceUnits.map((item) => item.chunk.unitId),
    },
    {
      step: "index",
      actor: "module07-mvp",
      occurredAt: generatedAt,
      inputIds: [recordId],
    },
  ];
}

export function runModule07IntegrationMvp(
  input: RunModule07IntegrationMvpInput
): RunModule07IntegrationMvpResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  assertIsoDateTime(generatedAt, "generatedAt");

  if (input.sessions.length === 0) {
    throw new Error("Module 07 MVP requires at least one integration session.");
  }

  const sortedSessions = sortByKey(input.sessions, (item) => item.sessionId);
  const sortedWearableMetrics = sortByKey(input.wearableMetrics, (item) => item.metricId);
  const sortedCgmMetrics = sortByKey(input.cgmMetrics, (item) => item.metricId);
  const sortedGeneticVariants = sortByKey(input.geneticVariants, (item) => item.variantId);
  const sortedAlgorithmAdjustments = sortByKey(
    input.algorithmAdjustments,
    (item) => item.adjustmentId
  );
  const sortedWriteLogs = sortByKey(input.dataLakeWriteLogs, (item) => item.writeId);

  const runtimeLogs: Module07MvpRuntimeLog[] = [];
  let runtimeLogCount = 0;
  const pushRuntimeLog = (
    stage: Module07MvpRuntimeLog["stage"],
    event: string,
    details: Module07MvpRuntimeLog["details"],
    sessionId: string | null = null
  ) => {
    runtimeLogCount += 1;
    runtimeLogs.push({
      logId: `m07-runtime-${String(runtimeLogCount).padStart(4, "0")}`,
      sessionId,
      module: RND_MODULE_07_NAME,
      phase: MODULE07_MVP_PHASE,
      stage,
      event,
      details,
      loggedAt: generatedAt,
    });
  };

  const sessionById = new Map<string, RndModule07IntegrationSession>();
  for (const session of sortedSessions) {
    assertRndModule07IntegrationSession(session);
    if (sessionById.has(session.sessionId)) {
      throw new Error(`Duplicate Module 07 sessionId detected: ${session.sessionId}`);
    }
    sessionById.set(session.sessionId, session);
  }

  for (const source of RND_MODULE_07_DATA_SOURCES) {
    const hasSource = sortedSessions.some((session) => session.source === source);
    if (!hasSource) {
      throw new Error(`Module 07 MVP input is missing source coverage for ${source}.`);
    }
  }

  const knownAppUserIds = new Set(sortedSessions.map((session) => session.appUserIdHash));

  const wearableMetricIds = new Set<string>();
  for (const metric of sortedWearableMetrics) {
    assertRndModule07WearableMetric(metric);
    if (wearableMetricIds.has(metric.metricId)) {
      throw new Error(`Duplicate wearable metricId detected: ${metric.metricId}`);
    }
    wearableMetricIds.add(metric.metricId);

    const session = sessionById.get(metric.sessionId);
    if (!session) {
      throw new Error(`Wearable metric ${metric.metricId} has unknown sessionId.`);
    }
    if (session.source !== "wearable") {
      throw new Error(`Wearable metric ${metric.metricId} must reference wearable source.`);
    }
  }

  const cgmMetricIds = new Set<string>();
  for (const metric of sortedCgmMetrics) {
    assertRndModule07CgmMetric(metric);
    if (cgmMetricIds.has(metric.metricId)) {
      throw new Error(`Duplicate CGM metricId detected: ${metric.metricId}`);
    }
    cgmMetricIds.add(metric.metricId);

    const session = sessionById.get(metric.sessionId);
    if (!session) {
      throw new Error(`CGM metric ${metric.metricId} has unknown sessionId.`);
    }
    if (session.source !== "continuous_glucose") {
      throw new Error(
        `CGM metric ${metric.metricId} must reference continuous_glucose source.`
      );
    }
  }

  const geneticVariantIds = new Set<string>();
  for (const variant of sortedGeneticVariants) {
    assertRndModule07GeneticVariant(variant);
    if (geneticVariantIds.has(variant.variantId)) {
      throw new Error(`Duplicate genetic variantId detected: ${variant.variantId}`);
    }
    geneticVariantIds.add(variant.variantId);

    const session = sessionById.get(variant.sessionId);
    if (!session) {
      throw new Error(`Genetic variant ${variant.variantId} has unknown sessionId.`);
    }
    if (session.source !== "genetic_test") {
      throw new Error(`Genetic variant ${variant.variantId} must reference genetic_test source.`);
    }
  }

  const adjustmentIds = new Set<string>();
  for (const adjustment of sortedAlgorithmAdjustments) {
    assertRndModule07AlgorithmAdjustment(adjustment);
    if (adjustmentIds.has(adjustment.adjustmentId)) {
      throw new Error(`Duplicate adjustmentId detected: ${adjustment.adjustmentId}`);
    }
    adjustmentIds.add(adjustment.adjustmentId);

    if (!knownAppUserIds.has(adjustment.appUserIdHash)) {
      throw new Error(
        `Algorithm adjustment ${adjustment.adjustmentId} has unknown appUserIdHash.`
      );
    }
  }

  const writeLogIds = new Set<string>();
  for (const writeLog of sortedWriteLogs) {
    assertRndModule07DataLakeWriteLog(writeLog);
    if (writeLogIds.has(writeLog.writeId)) {
      throw new Error(`Duplicate writeId detected: ${writeLog.writeId}`);
    }
    writeLogIds.add(writeLog.writeId);

    const session = sessionById.get(writeLog.sessionId);
    if (!session) {
      throw new Error(`Write log ${writeLog.writeId} has unknown sessionId.`);
    }
    if (session.source !== writeLog.source) {
      throw new Error(`Write log ${writeLog.writeId} source does not match session source.`);
    }
  }

  pushRuntimeLog("input_validation", "validated_inputs", {
    schemaVersion: RND_MODULE_07_SCHEMA_VERSION,
    sessionCount: sortedSessions.length,
    wearableMetricCount: sortedWearableMetrics.length,
    cgmMetricCount: sortedCgmMetrics.length,
    geneticVariantCount: sortedGeneticVariants.length,
    adjustmentCount: sortedAlgorithmAdjustments.length,
    writeLogCount: sortedWriteLogs.length,
  });

  const wearableMetricsBySession = groupBySessionId(sortedWearableMetrics);
  const cgmMetricsBySession = groupBySessionId(sortedCgmMetrics);
  const geneticVariantsBySession = groupBySessionId(sortedGeneticVariants);
  const adjustmentsByUserId = groupAdjustmentsByUserId(sortedAlgorithmAdjustments);
  const writeLogsBySession = groupBySessionId(sortedWriteLogs);

  const normalizedRecords: RndDataLakeRecord[] = [];
  const wiringLogs: Module07MvpWiringLog[] = [];
  let wiringLogCount = 0;
  const pushWiringLog = (
    payload: Omit<Module07MvpWiringLog, "wiringLogId" | "loggedAt">
  ) => {
    wiringLogCount += 1;
    wiringLogs.push({
      wiringLogId: `m07-wiring-${String(wiringLogCount).padStart(4, "0")}`,
      loggedAt: generatedAt,
      ...payload,
    });
  };

  for (const session of sortedSessions) {
    const sourceKind = mapSourceToModule02SourceKind(session.source);
    const sensitivity = mapSourceToSensitivity(session.source);
    const sessionWriteLogs = sortByKey(
      writeLogsBySession.get(session.sessionId) ?? [],
      (item) => item.writeId
    );
    const successfulWriteLogs = sessionWriteLogs.filter((writeLog) => writeLog.success);

    if (session.recordsAccepted > 0 && successfulWriteLogs.length === 0) {
      throw new Error(
        `Session ${session.sessionId} accepted records but has no successful write logs.`
      );
    }
    if (session.recordsAccepted === 0 && successfulWriteLogs.length > 0) {
      throw new Error(
        `Session ${session.sessionId} has successful write logs but zero accepted records.`
      );
    }

    const artifacts = buildSessionArtifacts(
      session,
      wearableMetricsBySession,
      cgmMetricsBySession,
      geneticVariantsBySession,
      adjustmentsByUserId
    );

    pushRuntimeLog(
      "normalization",
      "normalized_session",
      {
        source: session.source,
        status: session.status,
        recordsReceived: session.recordsReceived,
        recordsAccepted: session.recordsAccepted,
        metricCount: artifacts.metricCount,
        variantCount: artifacts.variantCount,
        adjustmentCount: artifacts.adjustmentCount,
      },
      session.sessionId
    );

    if (successfulWriteLogs.length === 0) {
      pushWiringLog({
        sessionId: session.sessionId,
        source: session.source,
        dataLakeRecordId: null,
        sourceKind,
        sensitivity,
        linked: false,
        reason: session.recordsAccepted === 0 ? "no_accepted_records" : "no_successful_write",
        metricCount: artifacts.metricCount,
        variantCount: artifacts.variantCount,
        adjustmentCount: artifacts.adjustmentCount,
      });
      continue;
    }

    for (const writeLog of successfulWriteLogs) {
      if (!session.dataLakeRecordIds.includes(writeLog.dataLakeRecordId)) {
        throw new Error(
          `Write log ${writeLog.writeId} references unknown Data Lake record for ${session.sessionId}.`
        );
      }

      const evidence = buildEvidenceUnits(sourceKind, session, generatedAt, artifacts);
      const lineage = buildLineageSteps(
        writeLog.dataLakeRecordId,
        session,
        evidence,
        generatedAt
      );
      const record = createRndDataLakeRecord({
        recordId: writeLog.dataLakeRecordId,
        sourceKind,
        sensitivity,
        collectedAt: generatedAt,
        payload: artifacts.payload,
        evidence,
        lineage,
      });
      assertRndDataLakeRecord(record);
      normalizedRecords.push(record);

      pushRuntimeLog(
        "linkage",
        "linked_data_lake_record",
        {
          source: session.source,
          sourceKind,
          sensitivity,
          dataLakeRecordId: writeLog.dataLakeRecordId,
          metricCount: artifacts.metricCount,
          variantCount: artifacts.variantCount,
          adjustmentCount: artifacts.adjustmentCount,
        },
        session.sessionId
      );

      pushWiringLog({
        sessionId: session.sessionId,
        source: session.source,
        dataLakeRecordId: writeLog.dataLakeRecordId,
        sourceKind,
        sensitivity,
        linked: true,
        reason: "linked_successfully",
        metricCount: artifacts.metricCount,
        variantCount: artifacts.variantCount,
        adjustmentCount: artifacts.adjustmentCount,
      });
    }
  }

  const sourceSummaries = buildSourceSummaries(sortedSessions);
  const overallIntegrationRate = Number(
    (
      sourceSummaries.reduce((sum, summary) => sum + summary.integrationRate, 0) /
      sourceSummaries.length
    ).toFixed(2)
  );
  const linkedDataLakeRecordIds = uniqueSorted(
    normalizedRecords.map((record) => record.recordId)
  );
  const runId = input.runId ?? buildRunId(generatedAt);

  const output: RndModule07IntegrationOutput = {
    runId,
    module: RND_MODULE_07_NAME,
    schemaVersion: RND_MODULE_07_SCHEMA_VERSION,
    generatedAt,
    sourceSummaries,
    overallIntegrationRate,
    linkedDataLakeRecordIds,
  };
  assertRndModule07IntegrationOutput(output);

  pushRuntimeLog("output_build", "built_output", {
    runId,
    sourceSummaryCount: output.sourceSummaries.length,
    overallIntegrationRate: output.overallIntegrationRate,
    linkedDataLakeRecordCount: output.linkedDataLakeRecordIds.length,
    normalizedRecordCount: normalizedRecords.length,
    wiringLogCount: wiringLogs.length,
  });

  return {
    module: RND_MODULE_07_NAME,
    phase: MODULE07_MVP_PHASE,
    generatedAt,
    output,
    normalizedRecords,
    wiringLogs,
    runtimeLogs,
  };
}
