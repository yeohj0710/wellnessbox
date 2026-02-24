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
  type RndModule07WearableMetric,
} from "./contracts";
import {
  assertRndDataLakeRecord,
  createRndDataLakeRecord,
  type RndDataLakeRecord,
  type RndDataSensitivity,
  type RndModule02SourceKind,
} from "../module02-data-lake/contracts";
import {
  MODULE07_MVP_PHASE,
  assertIsoDateTime,
  buildRunId,
  buildSourceSummaries,
  groupAdjustmentsByUserId,
  groupBySessionId,
  mapSourceToModule02SourceKind,
  mapSourceToSensitivity,
  sortByKey,
  uniqueSorted,
} from "./mvp-engine.shared";
import {
  buildEvidenceUnits,
  buildLineageSteps,
  buildSessionArtifacts,
} from "./mvp-engine.artifacts";

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
