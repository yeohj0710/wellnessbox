import {
  RND_MODULE_07_DATA_SOURCES,
  assertRndModule07AlgorithmAdjustment,
  assertRndModule07CgmMetric,
  assertRndModule07DataLakeWriteLog,
  assertRndModule07GeneticVariant,
  assertRndModule07IntegrationSession,
  assertRndModule07WearableMetric,
  type RndModule07AlgorithmAdjustment,
  type RndModule07CgmMetric,
  type RndModule07DataLakeWriteLog,
  type RndModule07GeneticVariant,
  type RndModule07IntegrationSession,
  type RndModule07WearableMetric,
} from "./contracts";
import { sortByKey } from "./mvp-engine.shared";
import type { RunModule07IntegrationMvpInput } from "./mvp-engine.types";

export type ValidatedModule07MvpInput = {
  sortedSessions: RndModule07IntegrationSession[];
  sortedWearableMetrics: RndModule07WearableMetric[];
  sortedCgmMetrics: RndModule07CgmMetric[];
  sortedGeneticVariants: RndModule07GeneticVariant[];
  sortedAlgorithmAdjustments: RndModule07AlgorithmAdjustment[];
  sortedWriteLogs: RndModule07DataLakeWriteLog[];
};

export function validateModule07MvpInput(
  input: RunModule07IntegrationMvpInput
): ValidatedModule07MvpInput {
  const sortedSessions = sortByKey(input.sessions, (item) => item.sessionId);
  const sortedWearableMetrics = sortByKey(input.wearableMetrics, (item) => item.metricId);
  const sortedCgmMetrics = sortByKey(input.cgmMetrics, (item) => item.metricId);
  const sortedGeneticVariants = sortByKey(input.geneticVariants, (item) => item.variantId);
  const sortedAlgorithmAdjustments = sortByKey(
    input.algorithmAdjustments,
    (item) => item.adjustmentId
  );
  const sortedWriteLogs = sortByKey(input.dataLakeWriteLogs, (item) => item.writeId);

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

  return {
    sortedSessions,
    sortedWearableMetrics,
    sortedCgmMetrics,
    sortedGeneticVariants,
    sortedAlgorithmAdjustments,
    sortedWriteLogs,
  };
}
