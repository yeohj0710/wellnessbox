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
  version: "report-score-profile.v2",
  weights: {
    survey: 0.35,
    health: 0.5,
    medication: 0.15,
  },
  riskBands: [
    { minScoreInclusive: 82, level: "low" },
    { minScoreInclusive: 64, level: "medium" },
    { minScoreInclusive: 0, level: "high" },
  ],
  healthMetricStatusScores: {
    normal: 88,
    high: 30,
    low: 58,
    caution: 58,
    unknown: 45,
  },
  healthMetricFallbackScore: 45,
  medicationScores: {
    availableWithItems: 78,
    availableEmpty: 62,
    none: 55,
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
