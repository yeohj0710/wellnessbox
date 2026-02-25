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

const SCORE_ENGINE_VERSION = "report-score-engine.v1";

const SCORE_LABELS: Record<ReportScoreKey, string> = {
  overall: "종합 점수",
  survey: "설문 점수",
  health: "검진 점수",
  medication: "복약 점수",
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampScore(value: number) {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
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
  const bySummary = scoreFromAnalysis(
    "survey",
    input.analysisSummary?.surveyScore,
    "분석 결과의 설문 점수를 사용했습니다."
  );
  if (bySummary) return bySummary;

  if (isFiniteNumber(input.analysisSurveyOverallScore)) {
    return estimatedScore(
      "survey",
      input.analysisSurveyOverallScore,
      "analysis_survey",
      "분석 설문 결과를 기반으로 점수를 추정했습니다."
    );
  }

  const sections = (input.surveySectionScores ?? []).filter(
    (section) => isFiniteNumber(section.score) && section.score != null
  );
  if (sections.length === 0) {
    return missingScore("survey", "설문 점수 계산에 필요한 응답 데이터가 없습니다.");
  }

  const hasWeightedQuestions = sections.some(
    (section) => isFiniteNumber(section.questionCount) && (section.questionCount ?? 0) > 0
  );

  if (hasWeightedQuestions) {
    const weighted = sections.reduce(
      (acc, section) => {
        const weight = Math.max(1, Math.round(section.questionCount ?? 0));
        return {
          scoreSum: acc.scoreSum + (section.score as number) * weight,
          weightSum: acc.weightSum + weight,
        };
      },
      { scoreSum: 0, weightSum: 0 }
    );
    const score = weighted.weightSum > 0 ? weighted.scoreSum / weighted.weightSum : 0;
    return estimatedScore(
      "survey",
      score,
      "survey_sections",
      "설문 섹션 점수를 가중 평균해 추정했습니다."
    );
  }

  const average =
    sections.reduce((sum, section) => sum + (section.score as number), 0) / sections.length;
  return estimatedScore(
    "survey",
    average,
    "survey_sections",
    "설문 섹션 평균 점수로 추정했습니다."
  );
}

function deriveHealthScore(
  input: ReportScoreEngineInput,
  profile: ReportScoreProfile
): ReportScoreDetail {
  const bySummary = scoreFromAnalysis(
    "health",
    input.analysisSummary?.healthScore,
    "분석 결과의 검진 점수를 사용했습니다."
  );
  if (bySummary) return bySummary;

  const metrics = input.healthCoreMetrics ?? [];
  if (metrics.length === 0) {
    return missingScore("health", "검진 점수 계산에 필요한 핵심 지표가 없습니다.");
  }

  const mapped = metrics.map((metric) =>
    resolveHealthMetricScore(metric.status, profile)
  );

  const score = mapped.reduce((sum, item) => sum + item, 0) / mapped.length;
  return estimatedScore(
    "health",
    score,
    "health_metrics",
    "검진 핵심 지표 상태를 기반으로 점수를 추정했습니다."
  );
}

function deriveMedicationScore(
  input: ReportScoreEngineInput,
  profile: ReportScoreProfile
): ReportScoreDetail {
  const bySummary = scoreFromAnalysis(
    "medication",
    input.analysisSummary?.medicationScore,
    "분석 결과의 복약 점수를 사용했습니다."
  );
  if (bySummary) return bySummary;

  const type = (input.medicationStatusType || "").trim().toLowerCase();
  const medicationCount = Math.max(0, Math.round(input.medicationCount ?? 0));

  if (!type || type === "unknown") {
    return missingScore("medication", "복약 점수 계산에 필요한 연동 정보가 없습니다.");
  }

  if (type === "fetch_failed") {
    return missingScore("medication", "복약 데이터를 불러오지 못해 점수를 계산할 수 없습니다.");
  }

  if (type === "available") {
    return estimatedScore(
      "medication",
      medicationCount > 0
        ? profile.medicationScores.availableWithItems
        : profile.medicationScores.availableEmpty,
      "medication_status",
      "최근 복약 이력의 연동 상태를 기반으로 점수를 추정했습니다."
    );
  }

  if (type === "none") {
    return estimatedScore(
      "medication",
      profile.medicationScores.none,
      "medication_status",
      "복약 이력이 없는 상태를 기준으로 점수를 추정했습니다."
    );
  }

  return missingScore("medication", "복약 점수 계산 조건이 충족되지 않았습니다.");
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
  const bySummary = scoreFromAnalysis(
    "overall",
    input.analysisSummary?.overallScore,
    "분석 결과의 종합 점수를 사용했습니다."
  );
  if (bySummary) return bySummary;

  const weightedSources = [
    { detail: components.survey, weight: profile.weights.survey },
    { detail: components.health, weight: profile.weights.health },
    { detail: components.medication, weight: profile.weights.medication },
  ].filter((item) => isFiniteNumber(item.detail.value));

  if (weightedSources.length === 0) {
    return missingScore("overall", "종합 점수 계산에 필요한 기반 데이터가 없습니다.");
  }

  const weighted = weightedSources.reduce(
    (acc, item) => ({
      scoreSum: acc.scoreSum + (item.detail.value as number) * item.weight,
      weightSum: acc.weightSum + item.weight,
    }),
    { scoreSum: 0, weightSum: 0 }
  );

  const score = weighted.weightSum > 0 ? weighted.scoreSum / weighted.weightSum : 0;
  const sources = weightedSources.map((item) => item.detail.label).join(", ");
  return estimatedScore(
    "overall",
    score,
    "weighted_components",
    `${sources}를 가중 합산해 종합 점수를 추정했습니다.`
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
    riskLevelFromAnalysis !== "unknown"
      ? riskLevelFromAnalysis
      : riskFromScore(overall.value, profile);

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
