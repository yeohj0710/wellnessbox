"use client";

import React from "react";
import type { NhisAiSummary, NhisFetchFailure } from "../types";
import {
  describeFetchFailure,
  formatDataCell,
  type CheckupMetricTone,
  type MedicationDigest,
} from "../utils";
import { parseNumberFromText, parseRangeFromText } from "../utils-health-metric-tone";
import styles from "../HealthLinkClient.module.css";

export type LatestCheckupRow = {
  metric?: string | null;
  value?: string | number | boolean | null;
  itemData?: string | number | boolean | null;
  normalA?: string | number | boolean | null;
  normalB?: string | number | boolean | null;
  suspicionDis?: string | number | boolean | null;
  statusTone: CheckupMetricTone;
};

export type MetricGroupId =
  | "all"
  | "body"
  | "pressure"
  | "sugar"
  | "lab"
  | "sense"
  | "other";

export type MedicationAnalysisModel = {
  latestMedication: MedicationDigest["recentMedications"][number] | null;
  primaryPurpose: string | null;
  summaryItems: Array<{ label: string; value: string }>;
  insights: string[];
  nextActions: string[];
};

export type MetricTab = {
  id: MetricGroupId;
  label: string;
  count: number;
};

export type MetricInsightCard = {
  metric: string;
  value: string;
  tone: CheckupMetricTone;
  interpretation: string;
  tip: string;
};

const METRIC_GROUPS: Array<{
  id: Exclude<MetricGroupId, "all">;
  label: string;
  pattern: RegExp;
}> = [
  {
    id: "body",
    label: "체성분",
    pattern: /(신장|체중|허리|체질량|bmi|비만|복부|체지방)/i,
  },
  {
    id: "pressure",
    label: "혈압·순환",
    pattern: /(혈압|수축기|이완기|맥박|심박|pulse|pressure|bp)/i,
  },
  {
    id: "sugar",
    label: "혈당",
    pattern: /(혈당|당화|hba1c|a1c|glucose)/i,
  },
  {
    id: "lab",
    label: "혈액·간·신장",
    pattern:
      /(콜레스테롤|hdl|ldl|중성지방|triglyceride|ast|alt|감마|ggt|간기능|크레아티닌|egfr|bun|요산|혈색소|헤모글로빈|rbc|wbc|platelet|혈구|헤마토크릿)/i,
  },
  {
    id: "sense",
    label: "시청각·소변",
    pattern: /(시력|청력|요단백|요당|요잠혈|요검사|소변|urine|protein)/i,
  },
  {
    id: "other",
    label: "기타",
    pattern: /.*/i,
  },
];

function resolveToneLabel(tone: CheckupMetricTone) {
  if (tone === "caution") return "주의";
  return "정상";
}

function resolveToneClass(tone: CheckupMetricTone) {
  if (tone === "caution") return styles.toneCaution;
  return styles.toneNormal;
}

export function resolveAiRiskLabel(level: NhisAiSummary["riskLevel"]) {
  if (level === "high") return "주의";
  if (level === "medium") return "관심";
  if (level === "low") return "안정";
  return "참고";
}

export function resolveAiRiskClass(level: NhisAiSummary["riskLevel"]) {
  if (level === "high") return styles.aiRiskHigh;
  if (level === "medium") return styles.aiRiskMedium;
  if (level === "low") return styles.aiRiskLow;
  return styles.aiRiskUnknown;
}

function shouldHideMetricTone(metric: string) {
  const normalized = metric.toLowerCase().replace(/\s+/g, "");
  return [
    "검진일",
    "검사일",
    "일자",
    "날짜",
    "checkupdate",
    "diagdate",
    "date",
  ].some((keyword) => normalized.includes(keyword));
}

function resolveMetricGroupId(metric: string): Exclude<MetricGroupId, "all"> {
  const normalized = metric.toLowerCase().replace(/\s+/g, "");
  for (const group of METRIC_GROUPS) {
    if (group.pattern.test(normalized)) return group.id;
  }
  return "other";
}

export function buildMetricGroups(rows: LatestCheckupRow[]) {
  const grouped: Record<Exclude<MetricGroupId, "all">, LatestCheckupRow[]> = {
    body: [],
    pressure: [],
    sugar: [],
    lab: [],
    sense: [],
    other: [],
  };

  for (const row of rows) {
    const metric = typeof row.metric === "string" ? row.metric.trim() : "";
    const groupId = metric ? resolveMetricGroupId(metric) : "other";
    grouped[groupId].push(row);
  }

  return grouped;
}

function resolveMetricActionTip(metric: string) {
  const normalized = metric.toLowerCase();
  if (/(혈압|수축기|이완기|pressure|bp)/i.test(normalized)) {
    return "아침/저녁 같은 시간대에 1주일 정도 재서 추세를 같이 확인해 보세요.";
  }
  if (/(혈당|당화|hba1c|a1c|glucose)/i.test(normalized)) {
    return "식사 시간과 간식 패턴을 기록하면 다음 검사에서 원인 파악이 쉬워져요.";
  }
  if (/(체질량|bmi|체중|허리|복부)/i.test(normalized)) {
    return "급격한 변화보다 수면과 식사 시간을 일정하게 맞추는 것부터 시작해 보세요.";
  }
  if (/(콜레스테롤|hdl|ldl|중성지방|triglyceride)/i.test(normalized)) {
    return "야식과 기름진 음식 빈도를 줄이고 한 달 후 변화를 비교해 보세요.";
  }
  if (/(ast|alt|간|ggt|감마|크레아티닌|egfr|신장)/i.test(normalized)) {
    return "충분한 수분 섭취와 생활습관 점검 후 필요하면 의료진과 상담해 보세요.";
  }
  return "이번 수치를 저장해 두고 다음 검진 때 같은 항목과 비교해 보세요.";
}

function resolveMetricInterpretation(
  metric: string,
  valueText: string,
  tone: CheckupMetricTone,
  reference: string
) {
  const normalizedMetric = metric.toLowerCase();
  const bp = valueText.replace(/\s/g, "").match(/^(\d{2,3})\/(\d{2,3})/);
  if (bp && /(혈압|수축기|이완기|pressure|bp)/i.test(normalizedMetric)) {
    const systolic = Number(bp[1]);
    const diastolic = Number(bp[2]);
    if (systolic >= 140 || diastolic >= 90) {
      return "혈압이 높게 기록되어 생활습관 점검이 필요해 보입니다.";
    }
    if (systolic < 90 || diastolic < 60) {
      return "혈압이 낮게 기록되어 컨디션과 함께 다시 확인해 보는 편이 좋아요.";
    }
    return "혈압이 기준 범위에 가까운 편으로 보여요.";
  }

  const numericValue = parseNumberFromText(valueText);
  if (numericValue !== null && reference) {
    const ranges = reference
      .split("|")
      .map((item) => parseRangeFromText(item))
      .filter((range) => range !== null);
    if (ranges.length > 0) {
      const inRange = ranges.some((range) => {
        const minOk = typeof range.min !== "number" || numericValue >= range.min;
        const maxOk = typeof range.max !== "number" || numericValue <= range.max;
        return minOk && maxOk;
      });
      if (inRange) {
        return "참고 범위 안에서 확인되는 수치예요.";
      }
      return "참고 범위와 차이가 있어 추가 확인이 필요할 수 있어요.";
    }
  }

  if (tone === "caution") {
    return "최근 검사 기준으로 생활 관리가 필요한 항목으로 표시됐어요.";
  }

  if (reference) {
    return `참고 범위(${reference})와 함께 보면 변화 여부를 더 쉽게 알 수 있어요.`;
  }
  return "현재 수치를 기준으로 다음 검사에서 추세를 비교해 보세요.";
}

function buildMetricGuide({
  metric,
  value,
  tone,
  reference,
}: {
  metric: string;
  value: string;
  tone: CheckupMetricTone;
  reference: string;
}) {
  return resolveMetricInterpretation(metric, value, tone, reference);
}

export function buildMetricInsightCards(
  rows: LatestCheckupRow[],
  maxItems = 4
): MetricInsightCard[] {
  const cards: MetricInsightCard[] = [];

  for (const row of rows) {
    const metric = typeof row.metric === "string" ? row.metric.trim() : "";
    if (!metric) continue;

    const value = formatDataCell(row.value ?? row.itemData ?? null);
    if (!value || value === "-") continue;

    const reference = [row.normalA, row.normalB, row.suspicionDis]
      .map((item) => formatDataCell(item))
      .filter((item) => item !== "-")
      .join(" | ");

    cards.push({
      metric,
      value,
      tone: row.statusTone,
      interpretation: buildMetricGuide({
        metric,
        value,
        tone: row.statusTone,
        reference,
      }),
      tip: resolveMetricActionTip(metric),
    });

    if (cards.length >= maxItems) break;
  }

  return cards;
}

export function buildMetricTabs(
  groupedRows: Record<Exclude<MetricGroupId, "all">, LatestCheckupRow[]>,
  totalCount: number
): MetricTab[] {
  const tabs: MetricTab[] = [
    {
      id: "all",
      label: "전체",
      count: totalCount,
    },
  ];

  for (const group of METRIC_GROUPS) {
    const count = groupedRows[group.id].length;
    if (count > 0) {
      tabs.push({
        id: group.id,
        label: group.label,
        count,
      });
    }
  }

  return tabs;
}

export function renderMetricCards(rows: LatestCheckupRow[]) {
  return rows.map((row, index) => {
    const metric = typeof row.metric === "string" ? row.metric : "-";
    const value = formatDataCell(row.value ?? row.itemData ?? null);
    const tone = row.statusTone;
    const showTone = !shouldHideMetricTone(metric);
    const reference = [row.normalA, row.normalB, row.suspicionDis]
      .map((item) => formatDataCell(item))
      .filter((item) => item !== "-")
      .join(" | ");
    const inlineGuide = buildMetricGuide({
      metric,
      value,
      tone,
      reference,
    });
    const showInlineGuide = tone === "caution";

    return (
      <article
        key={`${metric}-${value}-${index}`}
        className={styles.metricCardCompact}
      >
        <div className={styles.metricCardTop}>
          <strong>{metric}</strong>
          {showTone ? (
            <span className={`${styles.metricTone} ${resolveToneClass(tone)}`}>
              {resolveToneLabel(tone)}
            </span>
          ) : null}
        </div>
        <div className={styles.metricCardValue}>{value}</div>
        {showInlineGuide && inlineGuide ? (
          <p className={styles.metricGuide}>{inlineGuide}</p>
        ) : null}
        {reference ? <p className={styles.metricReference}>{reference}</p> : null}
      </article>
    );
  });
}

export function normalizeCompactText(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

export function buildMedicationAnalysisModel(
  medicationDigest: MedicationDigest
): MedicationAnalysisModel {
  const latestMedication = medicationDigest.recentMedications[0] ?? null;
  const primaryCondition =
    normalizeCompactText(medicationDigest.topConditions[0]?.label) ?? null;
  const primaryPurpose =
    normalizeCompactText(latestMedication?.effect) ?? primaryCondition;

  const summaryItems = [
    {
      label: "기준 기록",
      value: normalizeCompactText(latestMedication?.date) ?? "최근 기록",
    },
    {
      label: "복약 이력",
      value: `${medicationDigest.totalRows.toLocaleString("ko-KR")}건`,
    },
    {
      label: "고유 약품",
      value: `${medicationDigest.uniqueMedicineCount.toLocaleString("ko-KR")}종`,
    },
  ];

  const insights: string[] = [];
  if (latestMedication) {
    insights.push(
      `가장 최근 복약은 ${latestMedication.medicine} 기록을 기준으로 정리했어요.`
    );
  } else {
    insights.push("가장 최근 복약 기록이 없어 요약 중심으로 보여드려요.");
  }

  if (primaryPurpose) {
    insights.push(`복용 목적은 ${primaryPurpose} 관련으로 확인돼요.`);
  } else {
    insights.push("복용 목적 정보가 없어 약품명 중심으로 안내드려요.");
  }

  if (medicationDigest.totalRows <= 1) {
    insights.push("현재는 복약 기록이 1건이라 최신 이력 중심으로 분석했어요.");
  } else {
    insights.push("복약 이력이 여러 건이라 최근 순서로 변화를 함께 보여드려요.");
  }

  const nextActions = [
    "복약 정보가 바뀌었다면 다시 조회해서 최신 기록으로 확인해 주세요.",
    "건강검진 결과를 함께 연동하면 수치 기반 분석까지 더 정확하게 받을 수 있어요.",
  ];

  if (medicationDigest.totalRows > 1) {
    nextActions.unshift(
      `최근 기록 외에도 ${
        medicationDigest.totalRows - 1
      }건이 더 있어요. 아래 최근 이력에서 함께 확인해 주세요.`
    );
  }

  return {
    latestMedication,
    primaryPurpose,
    summaryItems,
    insights,
    nextActions,
  };
}

export function isSkippableFailure(
  failure: NhisFetchFailure,
  options: {
    hasAnyResult: boolean;
    hasCheckupRows: boolean;
    hasMedicationRows: boolean;
  }
) {
  const target = (failure.target || "").trim();
  const message = `${failure.errCd || ""} ${failure.errMsg || ""}`.toLowerCase();
  const isSessionExpired =
    (failure.errCd || "").trim().toUpperCase() === "LOGIN-999";

  if (isSessionExpired) return false;
  if (!options.hasAnyResult) return false;

  if (target === "medication" && options.hasCheckupRows) return true;
  if (target === "checkupOverview" && options.hasMedicationRows) return true;
  if (target === "healthAge" || target === "medical") return true;
  if (target === "checkupList" || target === "checkupYearly") return true;
  if (message.includes("invalid json")) return true;

  return false;
}

export function toFriendlyFailureMessage(failure: NhisFetchFailure) {
  const raw = describeFetchFailure(failure);
  if (/invalid json/i.test(raw)) {
    return "응답 형식이 불안정해서 이번에는 표시하지 않았어요.";
  }
  if (/timed?\s*out|timeout|지연/i.test(raw.toLowerCase())) {
    return "응답이 지연되어 이번에는 표시하지 못했어요.";
  }
  return raw
    .replace(/실패/g, "지연")
    .replace(/failed/gi, "지연")
    .replace(/error/gi, "안내");
}
