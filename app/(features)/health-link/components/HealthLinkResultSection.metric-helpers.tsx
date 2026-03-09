"use client";

import React from "react";
import type { NhisAiSummary, NhisDataRow } from "../types";
import {
  formatDataCell,
  resolveMetricDisplayValue,
  type CheckupMetricTone,
} from "../utils";
import {
  parseNumberFromText,
  parseRangeFromText,
} from "../utils-health-metric-tone";
import styles from "../HealthLinkClient.module.css";

export type LatestCheckupRow = NhisDataRow & {
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
    pattern: /(체중|허리|체지방|bmi|비만|복부|체성분)/i,
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
      /(콜레스테롤|hdl|ldl|중성지방|triglyceride|ast|alt|감마|ggt|크레아티닌|egfr|bun|요산|혈색소|헤모글로빈|rbc|wbc|platelet|적혈구|헤마토크리트)/i,
  },
  {
    id: "sense",
    label: "시청각·소변",
    pattern: /(시력|청력|요단백|요당|요잠혈|urine|protein)/i,
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

export function shouldHideMetricTone(metric: string) {
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
    if (!metric || shouldHideMetricTone(metric)) continue;
    grouped[resolveMetricGroupId(metric)].push(row);
  }

  return grouped;
}

function resolveMetricActionTip(metric: string) {
  const normalized = metric.toLowerCase();
  if (/(혈압|수축기|이완기|pressure|bp)/i.test(normalized)) {
    return "아침과 저녁 같은 시간대에 1주일 정도 재서 추세를 같이 확인해 보세요.";
  }
  if (/(혈당|당화|hba1c|a1c|glucose)/i.test(normalized)) {
    return "식사 시간과 간식 습관을 기록하면 다음 검사에서 원인 파악이 쉬워져요.";
  }
  if (/(체지방|bmi|체중|허리|복부)/i.test(normalized)) {
    return "급격한 변화보다 식사 시간과 수면을 일정하게 맞추는 것부터 시작해 보세요.";
  }
  if (/(콜레스테롤|hdl|ldl|중성지방|triglyceride)/i.test(normalized)) {
    return "야식과 기름진 음식 빈도를 줄이고 한 달 뒤 변화를 비교해 보세요.";
  }
  if (/(ast|alt|감마|ggt|크레아티닌|egfr|신장)/i.test(normalized)) {
    return "충분한 수분과 휴식도 중요하고 필요하면 의료진과 상담해 보세요.";
  }
  return "이번 수치를 기억해 두고 다음 검진에서 같은 항목과 비교해 보세요.";
}

function resolveMetricInterpretation(
  metric: string,
  valueText: string,
  tone: CheckupMetricTone,
  reference: string
) {
  const normalizedMetric = metric.toLowerCase();
  const bloodPressure = valueText.replace(/\s/g, "").match(/^(\d{2,3})\/(\d{2,3})/);
  if (bloodPressure && /(혈압|수축기|이완기|pressure|bp)/i.test(normalizedMetric)) {
    const systolic = Number(bloodPressure[1]);
    const diastolic = Number(bloodPressure[2]);
    if (systolic >= 140 || diastolic >= 90) {
      return "혈압이 높게 기록되어 생활 관리가 필요한 범위로 보입니다.";
    }
    if (systolic < 90 || diastolic < 60) {
      return "혈압이 낮게 기록되어 컨디션과 수분 상태를 다시 확인해 보는 편이 좋아요.";
    }
    return "혈압은 기준 범위에 가까운 편으로 보여요.";
  }

  const numericValue = parseNumberFromText(valueText);
  if (numericValue !== null && reference) {
    const ranges = reference
      .split("|")
      .map((item) => parseRangeFromText(item))
      .filter((range) => range !== null);
    if (ranges.length > 0) {
      const inRange = ranges.some((range) => {
        const minOk =
          typeof range.min !== "number" || numericValue >= range.min;
        const maxOk =
          typeof range.max !== "number" || numericValue <= range.max;
        return minOk && maxOk;
      });
      if (inRange) {
        return "참고 범위 안에서 확인되는 수치예요.";
      }
      return "참고 범위와 차이가 있어 추가 확인이 필요해 보여요.";
    }
  }

  if (tone === "caution") {
    return "최근 검진 기준으로 생활 관리가 필요한 항목으로 표시됐어요.";
  }

  if (reference) {
    return `참고 범위(${reference})와 함께 보면 변화 여부를 더 쉽게 볼 수 있어요.`;
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
    if (!metric || shouldHideMetricTone(metric)) continue;

    const value = resolveMetricDisplayValue(row);
    if (!value) continue;

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
  return rows
    .map((row, index) => {
      const metric = typeof row.metric === "string" ? row.metric : "-";
      if (shouldHideMetricTone(metric)) return null;
      const value = resolveMetricDisplayValue(row);
      if (!value) return null;
      const tone = row.statusTone;

      return (
        <article
          key={`${metric}-${value}-${index}`}
          className={styles.metricCardCompact}
        >
          <div className={styles.metricCardTop}>
            <strong>{metric}</strong>
            <span className={`${styles.metricTone} ${resolveToneClass(tone)}`}>
              {resolveToneLabel(tone)}
            </span>
          </div>
          <div className={styles.metricCardValue}>{value}</div>
        </article>
      );
    })
    .filter((item): item is JSX.Element => item !== null);
}
