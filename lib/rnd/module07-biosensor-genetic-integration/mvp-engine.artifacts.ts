import {
  RND_MODULE_07_NAME,
  type RndModule07AlgorithmAdjustment,
  type RndModule07CgmMetric,
  type RndModule07GeneticVariant,
  type RndModule07IntegrationSession,
  type RndModule07WearableMetric,
} from "./contracts";
import type {
  RndEvidenceUnit,
  RndLineageStep,
  RndModule02SourceKind,
} from "../module02-data-lake/contracts";
import { sortByKey, uniqueSorted } from "./mvp-engine.shared";

export type Module07SessionArtifacts = {
  payload: Record<string, unknown>;
  metricIds: string[];
  variantIds: string[];
  adjustmentIds: string[];
  metricCount: number;
  variantCount: number;
  adjustmentCount: number;
};

export function buildSessionArtifacts(
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

export function buildEvidenceUnits(
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

export function buildLineageSteps(
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
