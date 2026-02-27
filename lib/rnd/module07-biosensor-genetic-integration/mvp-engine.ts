// RND: Module 07 Biosensor and genetic integration MVP deterministic wiring runtime.

import {
  RND_MODULE_07_NAME,
  RND_MODULE_07_SCHEMA_VERSION,
  assertRndModule07IntegrationOutput,
  type RndModule07IntegrationOutput,
} from "./contracts";
import {
  assertRndDataLakeRecord,
  createRndDataLakeRecord,
  type RndDataLakeRecord,
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
import {
  validateModule07MvpInput,
} from "./mvp-engine.validation";
import type {
  Module07MvpRuntimeLog,
  Module07MvpWiringLog,
  RunModule07IntegrationMvpInput,
  RunModule07IntegrationMvpResult,
} from "./mvp-engine.types";

export type {
  Module07MvpRuntimeLog,
  Module07MvpWiringLog,
  RunModule07IntegrationMvpInput,
  RunModule07IntegrationMvpResult,
} from "./mvp-engine.types";

export function runModule07IntegrationMvp(
  input: RunModule07IntegrationMvpInput
): RunModule07IntegrationMvpResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  assertIsoDateTime(generatedAt, "generatedAt");

  if (input.sessions.length === 0) {
    throw new Error("Module 07 MVP requires at least one integration session.");
  }

  const {
    sortedSessions,
    sortedWearableMetrics,
    sortedCgmMetrics,
    sortedGeneticVariants,
    sortedAlgorithmAdjustments,
    sortedWriteLogs,
  } = validateModule07MvpInput(input);

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
