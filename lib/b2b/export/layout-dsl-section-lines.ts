import "server-only";

import type { B2bReportPayload } from "@/lib/b2b/report-payload";
import {
  medicationStatusLabel,
  normalizeMetricStatusLabel,
  normalizeRiskLevelLabel,
} from "@/lib/b2b/report-design";
import { maybeAppendUnit } from "@/lib/b2b/export/layout-dsl-flow";

export function compactText(text: string, maxLen: number) {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
}

export function renderScoreGaugeText(value: number | null | undefined, width = 10) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "점수 없음";
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  const filled = Math.round((normalized / 100) * width);
  const empty = Math.max(0, width - filled);
  return `[${"#".repeat(filled)}${"-".repeat(empty)}] ${normalized}점`;
}

export function toDisplayText(
  value: string | null | undefined,
  fallback = "미측정/데이터 없음"
) {
  const trimmed = (value || "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function buildSummaryLines(payload: B2bReportPayload) {
  const scoreDetails = payload.analysis.scoreDetails;
  const overallGauge = renderScoreGaugeText(payload.analysis.summary.overallScore);
  const surveyGauge = renderScoreGaugeText(payload.analysis.summary.surveyScore);
  const healthGauge = renderScoreGaugeText(payload.analysis.summary.healthScore);
  const medicationGauge = renderScoreGaugeText(payload.analysis.summary.medicationScore);

  const lines = [
    `종합 점수 ${overallGauge}`,
    `설문 ${surveyGauge} / 검진 ${healthGauge} / 복약 ${medicationGauge}`,
    `리스크 레벨: ${
      payload.analysis.summary.overallScore == null
        ? "산출 대기"
        : normalizeRiskLevelLabel(payload.analysis.summary.riskLevel)
    }`,
  ];
  const missingReasons = Object.values(scoreDetails)
    .filter((detail) => detail.status === "missing")
    .map((detail) => `${detail.label}: ${detail.reason}`)
    .slice(0, 2);
  if (missingReasons.length > 0) {
    lines.push(...missingReasons);
  }
  if (payload.analysis.summary.topIssues.length > 0) {
    lines.push("핵심 이슈 TOP3:");
    lines.push(
      ...payload.analysis.summary.topIssues
        .slice(0, 3)
        .map((item, index) => `${index + 1}. ${item.title} (${Math.round(item.score)}점)`)
    );
  }
  return lines;
}

export function buildHealthLines(payload: B2bReportPayload) {
  const lines = [
    `건강검진 연동 시각: ${
      payload.health.fetchedAt
        ? new Date(payload.health.fetchedAt).toLocaleString("ko-KR")
        : "없음"
    }`,
    ...payload.health.coreMetrics.slice(0, 8).map((metric) => {
      const value = maybeAppendUnit(toDisplayText(metric.value), metric.unit);
      return `${metric.label}: ${value} / ${normalizeMetricStatusLabel(metric.status)}`;
    }),
  ];
  if (payload.health.riskFlags.length > 0) {
    lines.push(
      `이상/주의 플래그: ${payload.health.riskFlags
        .slice(0, 4)
        .map((item) => `${item.label}(${item.severity})`)
        .join(", ")}`
    );
  }
  return lines;
}

export function buildMedicationLines(payload: B2bReportPayload) {
  const base = [
    `복약 상태: ${medicationStatusLabel(payload.health.medicationStatus.type)}`,
  ];
  if (payload.health.medicationStatus.message) {
    base.push(payload.health.medicationStatus.message);
  }
  if (payload.health.medications.length === 0) {
    base.push("최근 복약 데이터가 없습니다.");
    return base;
  }
  return [
    ...base,
    ...payload.health.medications.map((item) => {
      const dateText = item.date ? ` / ${item.date}` : "";
      const hospText = item.hospitalName ? ` / ${item.hospitalName}` : "";
      return `${item.medicationName}${dateText}${hospText}`;
    }),
  ];
}

export function buildSurveyLines(payload: B2bReportPayload) {
  const answeredCount = payload.survey.sectionScores.reduce(
    (sum, section) => sum + section.answeredCount,
    0
  );
  const questionCount = payload.survey.sectionScores.reduce(
    (sum, section) => sum + section.questionCount,
    0
  );
  const lines = [
    payload.survey.templateVersion
      ? `설문 템플릿 버전: v${payload.survey.templateVersion}`
      : "설문 템플릿 버전: 미지정",
    `선택 섹션: ${payload.survey.selectedSections.join(", ") || "없음"}`,
    `설문 종합 점수: ${
      typeof payload.survey.overallScore === "number"
        ? `${Math.round(payload.survey.overallScore)}점`
        : "점수 없음"
    }`,
    `응답 수: ${payload.survey.answers.length}개`,
    questionCount > 0
      ? `설문 완료율: ${Math.round((answeredCount / questionCount) * 100)}% (${answeredCount}/${questionCount})`
      : "설문 미진행: 응답 데이터가 없습니다.",
  ];
  lines.push(
    ...payload.survey.sectionScores
      .slice(0, 6)
      .map(
        (section) =>
          `${section.sectionTitle}: ${Math.round(section.score)}점 (${section.answeredCount}/${section.questionCount})`
      )
  );
  return lines;
}

export function buildPharmacistAndAiLines(payload: B2bReportPayload) {
  const lines = [
    `약사 요약: ${payload.pharmacist.summary || payload.pharmacist.note || "입력 없음"}`,
    `권장: ${payload.pharmacist.recommendations || "입력 없음"}`,
    `주의: ${payload.pharmacist.cautions || "입력 없음"}`,
  ];
  if (payload.analysis.aiEvaluation) {
    lines.push(`AI 종합평가: ${payload.analysis.aiEvaluation.summary}`);
    lines.push(`한 달 실천 가이드: ${payload.analysis.aiEvaluation.monthlyGuide}`);
    lines.push(
      ...payload.analysis.aiEvaluation.actionItems
        .slice(0, 2)
        .map((item) => `실천 항목: ${item}`)
    );
  }
  return lines;
}

export function buildGuideLines(payload: B2bReportPayload) {
  const aiActions = payload.analysis.aiEvaluation?.actionItems ?? [];
  const recommendationActions = payload.analysis.recommendations ?? [];
  const items = (aiActions.length > 0 ? aiActions : recommendationActions).slice(0, 5);
  if (items.length === 0) {
    return ["권장 실천 항목이 아직 생성되지 않았습니다."];
  }
  return items.map((item, index) => `[ ] ${index + 1}. ${item}`);
}

export function buildTrendLines(payload: B2bReportPayload) {
  if (payload.analysis.trend.months.length === 0) {
    return ["월별 추이 데이터가 없습니다."];
  }
  return payload.analysis.trend.months.slice(-6).map((month) => {
    const overall =
      typeof month.overallScore === "number" && Number.isFinite(month.overallScore)
        ? Math.round(month.overallScore)
        : null;
    const survey =
      typeof month.surveyScore === "number" && Number.isFinite(month.surveyScore)
        ? Math.round(month.surveyScore)
        : null;
    const health =
      typeof month.healthScore === "number" && Number.isFinite(month.healthScore)
        ? Math.round(month.healthScore)
        : null;
    return `${month.periodKey}: 종합 ${renderScoreGaugeText(overall, 8)} / 설문 ${
      survey == null ? "점수 없음" : `${survey}점`
    } / 검진 ${health == null ? "점수 없음" : `${health}점`}`;
  });
}
