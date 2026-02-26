import type {
  RndModule07AlgorithmAdjustment,
  RndModule07CgmMetric,
  RndModule07DataLakeWriteLog,
  RndModule07GeneticVariant,
  RndModule07IntegrationSession,
  RndModule07WearableMetric,
} from "./contracts";

export type Module07FixtureRecords = {
  sessions: RndModule07IntegrationSession[];
  wearableMetrics: RndModule07WearableMetric[];
  cgmMetrics: RndModule07CgmMetric[];
  geneticVariants: RndModule07GeneticVariant[];
  algorithmAdjustments: RndModule07AlgorithmAdjustment[];
  dataLakeWriteLogs: RndModule07DataLakeWriteLog[];
};

export function buildModule07FixtureRecords(
  generatedAt: string
): Module07FixtureRecords {
  const appUserIdHash = "sha256:7d7c2f4b8af0ef7d";

  const sessions: RndModule07IntegrationSession[] = [
    {
      sessionId: "rnd07-session-w-001",
      source: "wearable",
      appUserIdHash,
      startedAt: generatedAt,
      completedAt: generatedAt,
      status: "success",
      recordsReceived: 3,
      recordsAccepted: 3,
      schemaMapped: true,
      dataLakeRecordIds: ["rnd02-r07-wearable-001"],
      errorCode: null,
    },
    {
      sessionId: "rnd07-session-c-001",
      source: "continuous_glucose",
      appUserIdHash,
      startedAt: generatedAt,
      completedAt: generatedAt,
      status: "success",
      recordsReceived: 2,
      recordsAccepted: 2,
      schemaMapped: true,
      dataLakeRecordIds: ["rnd02-r07-cgm-001"],
      errorCode: null,
    },
    {
      sessionId: "rnd07-session-g-001",
      source: "genetic_test",
      appUserIdHash,
      startedAt: generatedAt,
      completedAt: generatedAt,
      status: "success",
      recordsReceived: 3,
      recordsAccepted: 3,
      schemaMapped: true,
      dataLakeRecordIds: ["rnd02-r07-genetic-001"],
      errorCode: null,
    },
  ];

  const wearableMetrics: RndModule07WearableMetric[] = [
    {
      metricId: "rnd07-wearable-steps-001",
      sessionId: "rnd07-session-w-001",
      category: "activity",
      metricKey: "steps_daily",
      value: 8312,
      unit: "count",
      measuredAt: generatedAt,
    },
    {
      metricId: "rnd07-wearable-hr-001",
      sessionId: "rnd07-session-w-001",
      category: "heart_rate",
      metricKey: "resting_heart_rate",
      value: 63,
      unit: "bpm",
      measuredAt: generatedAt,
    },
    {
      metricId: "rnd07-wearable-sleep-001",
      sessionId: "rnd07-session-w-001",
      category: "sleep",
      metricKey: "sleep_duration_minutes",
      value: 421,
      unit: "minute",
      measuredAt: generatedAt,
    },
  ];

  const cgmMetrics: RndModule07CgmMetric[] = [
    {
      metricId: "rnd07-cgm-glucose-001",
      sessionId: "rnd07-session-c-001",
      category: "glucose",
      metricKey: "mean_glucose_mg_dl",
      value: 108,
      unit: "mg/dL",
      measuredAt: generatedAt,
    },
    {
      metricId: "rnd07-cgm-tir-001",
      sessionId: "rnd07-session-c-001",
      category: "glucose",
      metricKey: "tir_ratio",
      value: 0.86,
      unit: "ratio",
      measuredAt: generatedAt,
    },
  ];

  const geneticVariants: RndModule07GeneticVariant[] = [
    {
      variantId: "rnd07-gene-mthfr-001",
      sessionId: "rnd07-session-g-001",
      gene: "MTHFR",
      snpId: "rs1801133",
      allele: "TT",
      riskLevel: "medium",
      interpretation: "Lower folate metabolism efficiency baseline.",
      parameterWeightDelta: 0.35,
      measuredAt: generatedAt,
    },
    {
      variantId: "rnd07-gene-cyp1a2-001",
      sessionId: "rnd07-session-g-001",
      gene: "CYP1A2",
      snpId: "rs762551",
      allele: "AC",
      riskLevel: "high",
      interpretation: "Higher caffeine sensitivity; monitor stimulant intake.",
      parameterWeightDelta: 0.62,
      measuredAt: generatedAt,
    },
    {
      variantId: "rnd07-gene-tcf7l2-001",
      sessionId: "rnd07-session-g-001",
      gene: "TCF7L2",
      snpId: "rs7903146",
      allele: "CT",
      riskLevel: "medium",
      interpretation: "Higher post-meal glucose response propensity.",
      parameterWeightDelta: 0.41,
      measuredAt: generatedAt,
    },
  ];

  const algorithmAdjustments: RndModule07AlgorithmAdjustment[] = [
    {
      adjustmentId: "rnd07-adjust-constraint-001",
      appUserIdHash,
      source: "genetic_test",
      kind: "constraint",
      targetKey: "folate_upper_bound_multiplier",
      value: 0.9,
      rationale: "MTHFR signal applies tighter upper-bound control for folate pathway.",
      appliedAt: generatedAt,
    },
    {
      adjustmentId: "rnd07-adjust-weight-001",
      appUserIdHash,
      source: "continuous_glucose",
      kind: "weight",
      targetKey: "glycemic_support_priority_weight",
      value: 1.25,
      rationale: "CGM TIR trend increases metabolic-balance optimization weight.",
      appliedAt: generatedAt,
    },
    {
      adjustmentId: "rnd07-adjust-parameter-001",
      appUserIdHash,
      source: "wearable",
      kind: "personal_parameter",
      targetKey: "sleep_recovery_index",
      value: 0.78,
      rationale: "Wearable sleep baseline updates personal recovery sensitivity parameter.",
      appliedAt: generatedAt,
    },
  ];

  const dataLakeWriteLogs: RndModule07DataLakeWriteLog[] = [
    {
      writeId: "rnd07-write-w-001",
      sessionId: "rnd07-session-w-001",
      source: "wearable",
      dataLakeRecordId: "rnd02-r07-wearable-001",
      success: true,
      writtenAt: generatedAt,
    },
    {
      writeId: "rnd07-write-c-001",
      sessionId: "rnd07-session-c-001",
      source: "continuous_glucose",
      dataLakeRecordId: "rnd02-r07-cgm-001",
      success: true,
      writtenAt: generatedAt,
    },
    {
      writeId: "rnd07-write-g-001",
      sessionId: "rnd07-session-g-001",
      source: "genetic_test",
      dataLakeRecordId: "rnd02-r07-genetic-001",
      success: true,
      writtenAt: generatedAt,
    },
  ];

  return {
    sessions,
    wearableMetrics,
    cgmMetrics,
    geneticVariants,
    algorithmAdjustments,
    dataLakeWriteLogs,
  };
}
