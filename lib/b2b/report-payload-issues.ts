import {
  extractFailedTargets,
  mergeValueWithUnit,
  type MedicationContainerState,
} from "@/lib/b2b/report-payload-health";
import { toText } from "@/lib/b2b/report-payload-shared";
import type {
  ReportScoreDetailMap,
  ReportScoreKey,
} from "@/lib/b2b/report-score-engine";

export type MedicationStatus = {
  type: "available" | "none" | "fetch_failed" | "unknown";
  message: string | null;
  failedTargets: string[];
};

export type CredibleTopIssue = {
  sectionKey: string;
  title: string;
  score: number;
  reason: string;
};

function clampIssueScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function pushCredibleIssue(list: CredibleTopIssue[], issue: CredibleTopIssue) {
  const title = toText(issue.title);
  if (!title) return;
  const normalizedKey = `${toText(issue.sectionKey)}|${title}`;
  const existingIndex = list.findIndex((item) => {
    const itemKey = `${toText(item.sectionKey)}|${toText(item.title)}`;
    return itemKey === normalizedKey;
  });
  const nextIssue = {
    sectionKey: toText(issue.sectionKey) || "-",
    title,
    score: clampIssueScore(issue.score),
    reason: toText(issue.reason),
  };
  if (existingIndex < 0) {
    list.push(nextIssue);
    return;
  }
  if (nextIssue.score > list[existingIndex].score) {
    list[existingIndex] = nextIssue;
  }
}

export function resolveMedicationStatus(input: {
  medications: Array<{
    medicationName: string;
    hospitalName: string | null;
    date: string | null;
    dosageDay: string | null;
  }>;
  containerState: MedicationContainerState;
  sourceMode: string | null;
  rawJson: unknown;
}): MedicationStatus {
  const failedTargets = extractFailedTargets(input.rawJson);
  const medicationFailed = failedTargets.includes("medication");
  if (medicationFailed) {
    return {
      type: "fetch_failed",
      message: "복약 정보를 불러오지 못했습니다.",
      failedTargets,
    };
  }
  if (input.medications.length > 0) {
    return {
      type: "available",
      message: null,
      failedTargets,
    };
  }
  if (!input.rawJson) {
    return {
      type: "unknown",
      message: "아직 건강 연동이 완료되지 않았습니다.",
      failedTargets,
    };
  }
  if (input.sourceMode === "mock") {
    return {
      type: "unknown",
      message: "데모 데이터에서는 복약 정보를 확인할 수 없습니다.",
      failedTargets,
    };
  }
  if (input.containerState === "missing" || input.containerState === "unrecognized") {
    return {
      type: "unknown",
      message: "복약 데이터 구조를 확인하지 못했습니다. 잠시 후 다시 연동해 주세요.",
      failedTargets,
    };
  }
  return {
    type: "none",
    message: "최근 3회 복약 이력이 없습니다.",
    failedTargets,
  };
}

export function buildCredibleTopIssues(input: {
  scoreDetails: ReportScoreDetailMap;
  analysisSummaryTopIssues: Array<{ sectionKey: string; title: string; score: number }>;
  surveySectionScores: Array<{
    sectionKey: string;
    sectionTitle: string;
    score: number;
    answeredCount: number;
    questionCount: number;
  }>;
  healthRiskFlags: Array<{
    key: string;
    label: string;
    severity: string;
    value: string;
    reason: string;
  }>;
  healthCoreMetrics: Array<{
    key: string;
    label: string;
    value: string;
    unit: string | null;
    status: string;
  }>;
  medicationStatus: MedicationStatus;
  fetchStatus: {
    partial: boolean;
    failedTargets: string[];
  };
}) {
  const issues: CredibleTopIssue[] = [];
  const scoreDetailOrder: ReportScoreKey[] = ["health", "survey", "medication", "overall"];

  for (const key of scoreDetailOrder) {
    const detail = input.scoreDetails[key];
    if (!detail) continue;
    if (detail.status === "missing") {
      pushCredibleIssue(issues, {
        sectionKey: key,
        title: `${detail.label} 근거 데이터 부족`,
        score: 82,
        reason: detail.reason,
      });
      continue;
    }
    if (detail.value == null || detail.value >= 74) continue;
    pushCredibleIssue(issues, {
      sectionKey: key,
      title: `${detail.label} 보완 필요`,
      score: 100 - detail.value,
      reason: detail.reason,
    });
  }

  const lowSurveySections = [...input.surveySectionScores]
    .filter((section) => Number.isFinite(section.score) && section.score < 72)
    .sort((left, right) => left.score - right.score)
    .slice(0, 2);
  for (const section of lowSurveySections) {
    const completion =
      section.questionCount > 0
        ? Math.round((section.answeredCount / section.questionCount) * 100)
        : 0;
    pushCredibleIssue(issues, {
      sectionKey: section.sectionKey || "survey",
      title: `${section.sectionTitle} 설문 보완 필요`,
      score: Math.max(38, 100 - section.score),
      reason: `응답 ${section.answeredCount}/${section.questionCount} (${completion}%)`,
    });
  }

  for (const flag of input.healthRiskFlags.slice(0, 3)) {
    const severity = toText(flag.severity).toLowerCase();
    const severityScore =
      severity === "high" ? 84 : severity === "medium" ? 68 : 54;
    const measuredValue = toText(flag.value);
    pushCredibleIssue(issues, {
      sectionKey: flag.key || "health",
      title: `${flag.label} 위험 신호`,
      score: severityScore,
      reason: toText(flag.reason) || (measuredValue ? `측정값 ${measuredValue}` : "지표 추적 필요"),
    });
  }

  if (input.healthRiskFlags.length === 0) {
    const metricWarnings = input.healthCoreMetrics
      .filter((metric) => {
        const status = toText(metric.status).toLowerCase();
        return status === "high" || status === "caution" || status === "low";
      })
      .slice(0, 2);
    for (const metric of metricWarnings) {
      const status = toText(metric.status).toLowerCase();
      const severityScore = status === "high" ? 76 : 58;
      const valueWithUnit = mergeValueWithUnit(metric.value, metric.unit);
      pushCredibleIssue(issues, {
        sectionKey: metric.key || "health",
        title: `${metric.label} 수치 확인 필요`,
        score: severityScore,
        reason: `측정값 ${valueWithUnit}`,
      });
    }
  }

  if (input.medicationStatus.type === "fetch_failed") {
    pushCredibleIssue(issues, {
      sectionKey: "medication",
      title: "복약 이력 수집 실패",
      score: 86,
      reason: input.medicationStatus.message || "복약 데이터를 다시 동기화해 주세요.",
    });
  } else if (input.medicationStatus.type === "unknown") {
    pushCredibleIssue(issues, {
      sectionKey: "medication",
      title: "복약 이력 확인 불충분",
      score: 63,
      reason:
        input.medicationStatus.message ||
        "복약 정보가 불명확해 안전성 평가의 신뢰도가 떨어집니다.",
    });
  }

  if (input.fetchStatus.partial || input.fetchStatus.failedTargets.length > 0) {
    pushCredibleIssue(issues, {
      sectionKey: "fetch",
      title: "데이터 동기화 일부 누락",
      score: 72,
      reason:
        input.fetchStatus.failedTargets.length > 0
          ? `누락 대상: ${input.fetchStatus.failedTargets.join(", ")}`
          : "원천 데이터 재수집이 필요합니다.",
    });
  }

  if (issues.length < 3) {
    for (const issue of input.analysisSummaryTopIssues) {
      if (issues.length >= 4) break;
      pushCredibleIssue(issues, {
        sectionKey: issue.sectionKey || "analysis",
        title: issue.title,
        score: clampIssueScore(100 - issue.score),
        reason: "기존 분석 결과에서 반복 관찰된 항목입니다.",
      });
    }
  }

  return issues.sort((left, right) => right.score - left.score).slice(0, 4);
}
