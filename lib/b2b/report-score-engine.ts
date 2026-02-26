import {
  DEFAULT_REPORT_SCORE_PROFILE,
  resolveHealthMetricScore,
  resolveRiskLevelFromScore,
  type ReportRiskLevel,
  type ReportScoreProfile,
} from "./report-score-profile";

export type ReportScoreKey = "overall" | "survey" | "health" | "medication";

export type ReportScoreStatus = "computed" | "estimated" | "missing";

export type ReportScoreSource =
  | "analysis_summary"
  | "analysis_survey"
  | "survey_sections"
  | "health_metrics"
  | "medication_status"
  | "weighted_components"
  | "none";

export type ReportScoreDetail = {
  key: ReportScoreKey;
  label: string;
  value: number | null;
  status: ReportScoreStatus;
  source: ReportScoreSource;
  reason: string;
};

export type ReportScoreDetailMap = Record<ReportScoreKey, ReportScoreDetail>;

export type ReportScoreEngineInput = {
  analysisSummary?: {
    overallScore?: number | null;
    surveyScore?: number | null;
    healthScore?: number | null;
    medicationScore?: number | null;
    riskLevel?: string | null;
  };
  analysisSurveyOverallScore?: number | null;
  surveySectionScores?: Array<{
    score?: number | null;
    answeredCount?: number | null;
    questionCount?: number | null;
  }>;
  healthCoreMetrics?: Array<{
    status?: string | null;
  }>;
  medicationStatusType?: string | null;
  medicationCount?: number | null;
};

export type ReportScoreEngineResult = {
  version: string;
  hasAnyScore: boolean;
  summary: {
    overallScore: number | null;
    surveyScore: number | null;
    healthScore: number | null;
    medicationScore: number | null;
    riskLevel: ReportRiskLevel;
  };
  details: ReportScoreDetailMap;
};

const SCORE_ENGINE_VERSION = "report-score-engine.v2";

const SCORE_LABELS: Record<ReportScoreKey, string> = {
  overall: "종합 점수",
  survey: "설문 점수",
  health: "검진 점수",
  medication: "복약 점수",
};

const MEASURABLE_HEALTH_STATUSES = new Set(["normal", "high", "low", "caution"]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampScore(value: number) {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function toSafeCount(value: unknown) {
  if (!isFiniteNumber(value)) return 0;
  return Math.max(0, Math.round(value));
}

function scoreFromAnalysis(
  key: ReportScoreKey,
  value: unknown,
  reason: string
): ReportScoreDetail | null {
  if (!isFiniteNumber(value)) return null;
  return {
    key,
    label: SCORE_LABELS[key],
    value: clampScore(value),
    status: "computed",
    source: "analysis_summary",
    reason,
  };
}

function missingScore(key: ReportScoreKey, reason: string): ReportScoreDetail {
  return {
    key,
    label: SCORE_LABELS[key],
    value: null,
    status: "missing",
    source: "none",
    reason,
  };
}

function estimatedScore(
  key: ReportScoreKey,
  value: number,
  source: Exclude<ReportScoreSource, "analysis_summary" | "none">,
  reason: string
): ReportScoreDetail {
  return {
    key,
    label: SCORE_LABELS[key],
    value: clampScore(value),
    status: "estimated",
    source,
    reason,
  };
}

function normalizeRiskLevel(value: string | null | undefined): ReportRiskLevel {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (["high", "고위험", "높음"].includes(normalized)) return "high";
  if (["medium", "중간", "주의"].includes(normalized)) return "medium";
  if (["low", "정상", "낮음"].includes(normalized)) return "low";
  return "unknown";
}

function riskFromScore(score: number | null, profile: ReportScoreProfile) {
  return resolveRiskLevelFromScore(score, profile);
}

function deriveSurveyScore(input: ReportScoreEngineInput): ReportScoreDetail {
  const sections = (input.surveySectionScores ?? []).filter(
    (section) => isFiniteNumber(section.score)
  );

  if (sections.length > 0) {
    const weighted = sections.reduce(
      (acc, section) => {
        const answered = toSafeCount(section.answeredCount);
        const questionCount = Math.max(answered, toSafeCount(section.questionCount));
        const completionRate =
          questionCount > 0 ? Math.max(0, Math.min(1, answered / questionCount)) : null;
        const coverageFactor =
          completionRate == null ? 0.85 : 0.55 + completionRate * 0.45;
        const adjustedScore = clampScore((section.score as number) * coverageFactor);
        const weight = questionCount > 0 ? questionCount : 1;
        return {
          scoreSum: acc.scoreSum + adjustedScore * weight,
          weightSum: acc.weightSum + weight,
          answeredSum: acc.answeredSum + answered,
          questionSum: acc.questionSum + questionCount,
        };
      },
      { scoreSum: 0, weightSum: 0, answeredSum: 0, questionSum: 0 }
    );

    const score = weighted.weightSum > 0 ? weighted.scoreSum / weighted.weightSum : 0;
    const completionPercent =
      weighted.questionSum > 0
        ? Math.round((weighted.answeredSum / weighted.questionSum) * 100)
        : 0;
    return estimatedScore(
      "survey",
      score,
      "survey_sections",
      `설문 섹션 점수와 응답완료율(${completionPercent}%)을 함께 반영해 계산했습니다.`
    );
  }

  if (isFiniteNumber(input.analysisSurveyOverallScore)) {
    return estimatedScore(
      "survey",
      input.analysisSurveyOverallScore,
      "analysis_survey",
      "설문 섹션 데이터가 부족해 분석 설문 점수를 보조값으로 사용했습니다."
    );
  }

  const bySummary = scoreFromAnalysis(
    "survey",
    input.analysisSummary?.surveyScore,
    "설문 원천 데이터가 부족해 분석 요약 점수를 사용했습니다."
  );
  if (bySummary) return bySummary;

  return missingScore("survey", "설문 응답이 부족해 점수를 계산할 수 없습니다.");
}

function deriveHealthScore(
  input: ReportScoreEngineInput,
  profile: ReportScoreProfile
): ReportScoreDetail {
  const metrics = input.healthCoreMetrics ?? [];
  if (metrics.length > 0) {
    const measurable = metrics.filter((metric) =>
      MEASURABLE_HEALTH_STATUSES.has((metric.status || "").trim().toLowerCase())
    );

    if (measurable.length > 0) {
      const base =
        measurable.reduce(
          (sum, metric) => sum + resolveHealthMetricScore(metric.status, profile),
          0
        ) / measurable.length;
      const unknownCount = Math.max(0, metrics.length - measurable.length);
      const unknownPenalty = (unknownCount / metrics.length) * 12;
      return estimatedScore(
        "health",
        base - unknownPenalty,
        "health_metrics",
        `검진 상태 ${measurable.length}개를 기준으로 계산했고, 미측정 ${unknownCount}개는 보수적으로 감점했습니다.`
      );
    }
  }

  const bySummary = scoreFromAnalysis(
    "health",
    input.analysisSummary?.healthScore,
    "검진 지표 상태값이 부족해 분석 요약 점수를 사용했습니다."
  );
  if (bySummary) return bySummary;

  return missingScore("health", "검진 지표 상태 정보가 부족해 점수를 계산할 수 없습니다.");
}

function deriveMedicationScore(
  input: ReportScoreEngineInput,
  profile: ReportScoreProfile
): ReportScoreDetail {
  const type = (input.medicationStatusType || "").trim().toLowerCase();
  const medicationCount = Math.max(0, Math.round(input.medicationCount ?? 0));

  if (type === "fetch_failed") {
    return missingScore(
      "medication",
      "복약 데이터 조회에 실패해 점수를 계산할 수 없습니다."
    );
  }

  if (type === "available") {
    const base =
      medicationCount > 0
        ? profile.medicationScores.availableWithItems
        : profile.medicationScores.availableEmpty;
    const densityBonus = medicationCount > 0 ? Math.min(8, (medicationCount - 1) * 2) : 0;
    return estimatedScore(
      "medication",
      base + densityBonus,
      "medication_status",
      `복약 연동 상태와 최근 이력 ${medicationCount}건을 기준으로 계산했습니다.`
    );
  }

  if (type === "none") {
    return estimatedScore(
      "medication",
      profile.medicationScores.none,
      "medication_status",
      "최근 복약 이력이 확인되지 않아 보수적으로 계산했습니다."
    );
  }

  const bySummary = scoreFromAnalysis(
    "medication",
    input.analysisSummary?.medicationScore,
    "복약 연동 정보가 부족해 분석 요약 점수를 사용했습니다."
  );
  if (bySummary) return bySummary;

  return missingScore("medication", "복약 연동 상태가 없어 점수를 계산할 수 없습니다.");
}

function deriveOverallScore(
  input: ReportScoreEngineInput,
  components: {
    survey: ReportScoreDetail;
    health: ReportScoreDetail;
    medication: ReportScoreDetail;
  },
  profile: ReportScoreProfile
): ReportScoreDetail {
  const weightedSources = [
    { detail: components.survey, weight: profile.weights.survey },
    { detail: components.health, weight: profile.weights.health },
    { detail: components.medication, weight: profile.weights.medication },
  ].filter((item) => isFiniteNumber(item.detail.value));

  if (weightedSources.length >= 2) {
    const weighted = weightedSources.reduce(
      (acc, item) => ({
        scoreSum: acc.scoreSum + (item.detail.value as number) * item.weight,
        weightSum: acc.weightSum + item.weight,
      }),
      { scoreSum: 0, weightSum: 0 }
    );
    const normalizedScore = weighted.weightSum > 0 ? weighted.scoreSum / weighted.weightSum : 0;
    const missingCount = 3 - weightedSources.length;
    const estimatedCount = weightedSources.filter(
      (item) => item.detail.status !== "computed"
    ).length;
    const confidencePenalty = missingCount * 8 + estimatedCount * 2;
    const sources = weightedSources.map((item) => item.detail.label).join(", ");
    return estimatedScore(
      "overall",
      normalizedScore - confidencePenalty,
      "weighted_components",
      `${sources}를 가중 합산했고, 누락/추정 항목에 대해 ${confidencePenalty}점 보수 보정을 적용했습니다.`
    );
  }

  const bySummary = scoreFromAnalysis(
    "overall",
    input.analysisSummary?.overallScore,
    "지표가 부족해 분석 요약 종합 점수를 사용했습니다."
  );
  if (bySummary) return bySummary;

  return missingScore(
    "overall",
    "종합 점수 산출을 위한 핵심 점수(설문·검진·복약)가 부족합니다."
  );
}

export function resolveReportScores(
  input: ReportScoreEngineInput,
  profile: ReportScoreProfile = DEFAULT_REPORT_SCORE_PROFILE
): ReportScoreEngineResult {
  const survey = deriveSurveyScore(input);
  const health = deriveHealthScore(input, profile);
  const medication = deriveMedicationScore(input, profile);
  const overall = deriveOverallScore(input, { survey, health, medication }, profile);

  const riskLevelFromAnalysis = normalizeRiskLevel(input.analysisSummary?.riskLevel);
  const riskLevel =
    overall.value != null
      ? riskFromScore(overall.value, profile)
      : riskLevelFromAnalysis !== "unknown"
        ? riskLevelFromAnalysis
        : "unknown";

  const details: ReportScoreDetailMap = {
    overall,
    survey,
    health,
    medication,
  };

  const hasAnyScore = Object.values(details).some((detail) => isFiniteNumber(detail.value));

  return {
    version: SCORE_ENGINE_VERSION,
    hasAnyScore,
    summary: {
      overallScore: overall.value,
      surveyScore: survey.value,
      healthScore: health.value,
      medicationScore: medication.value,
      riskLevel,
    },
    details,
  };
}
