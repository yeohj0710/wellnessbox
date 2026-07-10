export type ResearchKpi = {
  id: string;
  name: string;
  n: number;
  displayValue: string;
  proxyValue: number;
  ci95: number[] | null;
  threshold: string;
  guardband: string;
  proxyPass: boolean;
  replacementStatus: string;
};

export type ResearchSummary = {
  mode: string;
  proxyResearchComplete: boolean;
  realResearchComplete: boolean;
  dataset: {
    total: number;
    splits: { train: number; validation: number; calibration: number; blindTest: number };
    scenarioFamilies: number;
    generatorVerifierDisagreements: number;
    adjudications: number;
    teacherSessions: Record<string, string>;
  };
  model: {
    name: string;
    type: string;
    countClassifier: string;
    featureCount: number;
    ingredientClasses: number;
    trainRecords: number;
    blindTestRecords: number;
    labelClass: string;
    recommendationSetPrecisionPercent: number;
    recommendationSetPrecisionCi95: number[];
    microPrecision: number;
    microRecall: number;
    microF1: number;
    exactMatch: number;
    recommendationCountAccuracy: number;
  };
  cohorts: Record<string, number>;
  kpis: ResearchKpi[];
  provenance: {
    fileCount: number;
    manifestSha256: string;
    modelArtifactSha256: string;
    proxyKpiReportSha256: string;
    sourceArtifact: string;
    bundledEvidenceManifest: string;
    bundledKpiReport: string;
  };
  limitations: string[];
  replacementPlan: string[];
  disclosure: string;
};

export type ExplainedCandidate = {
  ingredientId: string;
  label: string;
  score: number;
  rank: number;
  intercept: number;
  linearScore: number;
  selectedByModel: boolean;
  blockedBySafety?: boolean;
  contributions: Array<{
    token: string;
    index: number;
    weight: number;
    contribution: number;
  }>;
};

export type InferenceExplanation = {
  formula: string;
  activeFeatures: Array<{ token: string; index: number }>;
  countDecision: {
    predictedCount: number;
    classScores: Array<{ rawClass: number; recommendationCount: number; linearScore: number }>;
  };
  candidateScores: ExplainedCandidate[];
  preSafetySelection: ExplainedCandidate[];
  postSafetySelection: Array<{ ingredientId: string; label: string; score: number }>;
};
