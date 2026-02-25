export type ReportRiskLevel = "low" | "medium" | "high" | "unknown";

export type ReportScoreWeights = {
  survey: number;
  health: number;
  medication: number;
};

export type ReportRiskBand = {
  minScoreInclusive: number;
  level: Exclude<ReportRiskLevel, "unknown">;
};

export type ReportScoreProfile = {
  version: string;
  weights: ReportScoreWeights;
  riskBands: ReportRiskBand[];
  healthMetricStatusScores: Record<string, number>;
  healthMetricFallbackScore: number;
  medicationScores: {
    availableWithItems: number;
    availableEmpty: number;
    none: number;
  };
};

export const DEFAULT_REPORT_SCORE_PROFILE: ReportScoreProfile = {
  version: "report-score-profile.v1",
  weights: {
    survey: 0.5,
    health: 0.35,
    medication: 0.15,
  },
  riskBands: [
    { minScoreInclusive: 80, level: "low" },
    { minScoreInclusive: 60, level: "medium" },
    { minScoreInclusive: 0, level: "high" },
  ],
  healthMetricStatusScores: {
    normal: 85,
    high: 35,
    low: 60,
    caution: 60,
    unknown: 50,
  },
  healthMetricFallbackScore: 50,
  medicationScores: {
    availableWithItems: 85,
    availableEmpty: 75,
    none: 60,
  },
};

export function resolveRiskLevelFromScore(
  score: number | null,
  profile: ReportScoreProfile = DEFAULT_REPORT_SCORE_PROFILE
): ReportRiskLevel {
  if (typeof score !== "number" || !Number.isFinite(score)) return "unknown";
  const sortedBands = [...profile.riskBands].sort(
    (a, b) => b.minScoreInclusive - a.minScoreInclusive
  );
  for (const band of sortedBands) {
    if (score >= band.minScoreInclusive) return band.level;
  }
  return "unknown";
}

export function resolveHealthMetricScore(
  status: string | null | undefined,
  profile: ReportScoreProfile = DEFAULT_REPORT_SCORE_PROFILE
) {
  const normalized = (status || "").trim().toLowerCase();
  if (!normalized) return profile.healthMetricFallbackScore;
  return (
    profile.healthMetricStatusScores[normalized] ?? profile.healthMetricFallbackScore
  );
}
