// RND: Module 07 Biosensor and genetic integration scaffold fixture builder.

import {
  RND_MODULE_07_DATA_SOURCES,
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
import { buildModule07FixtureRecords } from "./scaffold-fixtures";

export type Module07ScaffoldBundle = {
  generatedAt: string;
  sessions: RndModule07IntegrationSession[];
  wearableMetrics: RndModule07WearableMetric[];
  cgmMetrics: RndModule07CgmMetric[];
  geneticVariants: RndModule07GeneticVariant[];
  algorithmAdjustments: RndModule07AlgorithmAdjustment[];
  dataLakeWriteLogs: RndModule07DataLakeWriteLog[];
  output: RndModule07IntegrationOutput;
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

export function buildModule07ScaffoldBundle(
  generatedAt = new Date().toISOString()
): Module07ScaffoldBundle {
  assertIsoDateTime(generatedAt, "generatedAt");

  const {
    sessions,
    wearableMetrics,
    cgmMetrics,
    geneticVariants,
    algorithmAdjustments,
    dataLakeWriteLogs,
  } = buildModule07FixtureRecords(generatedAt);

  const sourceSummaries = buildSourceSummaries(sessions);
  const overallIntegrationRate = Number(
    (
      sourceSummaries.reduce((sum, summary) => sum + summary.integrationRate, 0) /
      sourceSummaries.length
    ).toFixed(2)
  );
  const linkedDataLakeRecordIds = Array.from(
    new Set(
      dataLakeWriteLogs
        .filter((log) => log.success)
        .map((log) => log.dataLakeRecordId)
    )
  );

  const output: RndModule07IntegrationOutput = {
    runId: "rnd07-run-2026-02-scaffold-001",
    module: "07_biosensor_and_genetic_data_integration",
    schemaVersion: "2026-02-scaffold-v1",
    generatedAt,
    sourceSummaries,
    overallIntegrationRate,
    linkedDataLakeRecordIds,
  };

  const bundle: Module07ScaffoldBundle = {
    generatedAt,
    sessions,
    wearableMetrics,
    cgmMetrics,
    geneticVariants,
    algorithmAdjustments,
    dataLakeWriteLogs,
    output,
  };
  assertModule07ScaffoldBundle(bundle);
  return bundle;
}

function summarizeSessionsBySource(
  sessions: RndModule07IntegrationSession[]
): Map<RndModule07DataSource, RndModule07SourceSummary> {
  const summaryMap = new Map<RndModule07DataSource, RndModule07SourceSummary>();
  buildSourceSummaries(sessions).forEach((summary) => {
    summaryMap.set(summary.source, summary);
  });
  return summaryMap;
}

export function assertModule07ScaffoldBundle(bundle: Module07ScaffoldBundle): void {
  assertIsoDateTime(bundle.generatedAt, "generatedAt");

  if (bundle.sessions.length === 0) {
    throw new Error("At least one Module 07 integration session is required.");
  }

  const sessionById = new Map<string, RndModule07IntegrationSession>();
  bundle.sessions.forEach((session) => {
    assertRndModule07IntegrationSession(session);
    if (sessionById.has(session.sessionId)) {
      throw new Error(`Duplicate Module 07 sessionId detected: ${session.sessionId}.`);
    }
    sessionById.set(session.sessionId, session);
  });

  const coveredSources = new Set(bundle.sessions.map((session) => session.source));
  RND_MODULE_07_DATA_SOURCES.forEach((source) => {
    if (!coveredSources.has(source)) {
      throw new Error(`Module 07 scaffold is missing source coverage for ${source}.`);
    }
  });

  if (bundle.wearableMetrics.length === 0) {
    throw new Error("At least one Module 07 wearable metric is required.");
  }
  bundle.wearableMetrics.forEach((metric) => {
    assertRndModule07WearableMetric(metric);
    const session = sessionById.get(metric.sessionId);
    if (!session) {
      throw new Error(`Wearable metric ${metric.metricId} has unknown sessionId.`);
    }
    if (session.source !== "wearable") {
      throw new Error(
        `Wearable metric ${metric.metricId} must reference wearable source session.`
      );
    }
  });

  if (bundle.cgmMetrics.length === 0) {
    throw new Error("At least one Module 07 CGM metric is required.");
  }
  bundle.cgmMetrics.forEach((metric) => {
    assertRndModule07CgmMetric(metric);
    const session = sessionById.get(metric.sessionId);
    if (!session) {
      throw new Error(`CGM metric ${metric.metricId} has unknown sessionId.`);
    }
    if (session.source !== "continuous_glucose") {
      throw new Error(
        `CGM metric ${metric.metricId} must reference continuous_glucose source session.`
      );
    }
  });

  if (bundle.geneticVariants.length === 0) {
    throw new Error("At least one Module 07 genetic variant is required.");
  }
  bundle.geneticVariants.forEach((variant) => {
    assertRndModule07GeneticVariant(variant);
    const session = sessionById.get(variant.sessionId);
    if (!session) {
      throw new Error(`Genetic variant ${variant.variantId} has unknown sessionId.`);
    }
    if (session.source !== "genetic_test") {
      throw new Error(
        `Genetic variant ${variant.variantId} must reference genetic_test source session.`
      );
    }
  });

  if (bundle.algorithmAdjustments.length === 0) {
    throw new Error("At least one Module 07 algorithm adjustment is required.");
  }
  const knownUserIds = new Set(bundle.sessions.map((session) => session.appUserIdHash));
  bundle.algorithmAdjustments.forEach((adjustment) => {
    assertRndModule07AlgorithmAdjustment(adjustment);
    if (!knownUserIds.has(adjustment.appUserIdHash)) {
      throw new Error(
        `Algorithm adjustment ${adjustment.adjustmentId} has unknown appUserIdHash.`
      );
    }
  });

  if (bundle.dataLakeWriteLogs.length === 0) {
    throw new Error("At least one Module 07 Data Lake write log is required.");
  }
  const writeLogIds = new Set<string>();
  bundle.dataLakeWriteLogs.forEach((writeLog) => {
    assertRndModule07DataLakeWriteLog(writeLog);
    if (writeLogIds.has(writeLog.writeId)) {
      throw new Error(`Duplicate Module 07 writeId detected: ${writeLog.writeId}.`);
    }
    writeLogIds.add(writeLog.writeId);

    const session = sessionById.get(writeLog.sessionId);
    if (!session) {
      throw new Error(`Write log ${writeLog.writeId} has unknown sessionId.`);
    }
    if (session.source !== writeLog.source) {
      throw new Error(`Write log ${writeLog.writeId} source mismatch with session.`);
    }
    if (writeLog.success && !session.dataLakeRecordIds.includes(writeLog.dataLakeRecordId)) {
      throw new Error(
        `Write log ${writeLog.writeId} references unknown Data Lake record for session.`
      );
    }
  });

  bundle.sessions.forEach((session) => {
    if (session.recordsAccepted > 0) {
      const successfulWrites = bundle.dataLakeWriteLogs.filter(
        (writeLog) => writeLog.sessionId === session.sessionId && writeLog.success
      );
      if (successfulWrites.length === 0) {
        throw new Error(
          `Session ${session.sessionId} accepted records but has no successful Data Lake write.`
        );
      }
    }
  });

  assertRndModule07IntegrationOutput(bundle.output);
  if (bundle.output.generatedAt !== bundle.generatedAt) {
    throw new Error("Module 07 bundle generatedAt must match output generatedAt.");
  }

  const summaryBySource = new Map<RndModule07DataSource, RndModule07SourceSummary>();
  bundle.output.sourceSummaries.forEach((summary) => {
    if (summaryBySource.has(summary.source)) {
      throw new Error(`Duplicate source summary detected for ${summary.source}.`);
    }
    summaryBySource.set(summary.source, summary);
  });

  RND_MODULE_07_DATA_SOURCES.forEach((source) => {
    if (!summaryBySource.has(source)) {
      throw new Error(`Missing output source summary for ${source}.`);
    }
  });

  const expectedSummaryBySource = summarizeSessionsBySource(bundle.sessions);
  RND_MODULE_07_DATA_SOURCES.forEach((source) => {
    const actual = summaryBySource.get(source);
    const expected = expectedSummaryBySource.get(source);
    if (!actual || !expected) {
      throw new Error(`Missing expected summary for ${source}.`);
    }
    if (actual.totalSessions !== expected.totalSessions) {
      throw new Error(`Output totalSessions mismatch for ${source}.`);
    }
    if (actual.successfulSessions !== expected.successfulSessions) {
      throw new Error(`Output successfulSessions mismatch for ${source}.`);
    }
    if (actual.sampleCount !== expected.sampleCount) {
      throw new Error(`Output sampleCount mismatch for ${source}.`);
    }
    if (actual.integrationRate !== expected.integrationRate) {
      throw new Error(`Output integrationRate mismatch for ${source}.`);
    }
  });

  const expectedOverallIntegrationRate = Number(
    (
      RND_MODULE_07_DATA_SOURCES.reduce((sum, source) => {
        const summary = summaryBySource.get(source);
        return sum + (summary ? summary.integrationRate : 0);
      }, 0) / RND_MODULE_07_DATA_SOURCES.length
    ).toFixed(2)
  );
  if (bundle.output.overallIntegrationRate !== expectedOverallIntegrationRate) {
    throw new Error("Output overallIntegrationRate mismatch.");
  }

  const expectedLinkedRecordIds = new Set(
    bundle.dataLakeWriteLogs
      .filter((writeLog) => writeLog.success)
      .map((writeLog) => writeLog.dataLakeRecordId)
  );
  const actualLinkedRecordIds = new Set(bundle.output.linkedDataLakeRecordIds);

  if (expectedLinkedRecordIds.size !== actualLinkedRecordIds.size) {
    throw new Error("Output linkedDataLakeRecordIds count mismatch.");
  }
  expectedLinkedRecordIds.forEach((recordId) => {
    if (!actualLinkedRecordIds.has(recordId)) {
      throw new Error(`Missing linked Data Lake recordId in output: ${recordId}.`);
    }
  });
}
