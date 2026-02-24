"use client";

import type { NhisAiSummary } from "../types";
import { HEALTH_LINK_COPY } from "../copy";
import styles from "../HealthLinkClient.module.css";
import { resolveAiRiskClass, resolveAiRiskLabel } from "./HealthLinkResultSection.helpers";

export type SummaryInsightItem = {
  metric: string;
  value: string;
  interpretation: string;
  tip: string;
  tone: "normal" | "caution" | "unknown";
};

type HealthLinkSummaryHeroProps = {
  checkupCount: number;
  cautionCount: number;
  medicationCount: number;
  showCheckupCount: boolean;
  showMedicationCount: boolean;
  summaryHeadline: string;
  summaryBody: string;
  summaryRiskLevel: NhisAiSummary["riskLevel"] | "unknown";
  summaryInsights: SummaryInsightItem[];
};

function resolveInsightToneLabel(tone: SummaryInsightItem["tone"]) {
  if (tone === "caution") return HEALTH_LINK_COPY.result.statusCaution;
  if (tone === "normal") return HEALTH_LINK_COPY.result.statusNormal;
  return HEALTH_LINK_COPY.result.statusUnknown;
}

function resolveInsightToneClass(tone: SummaryInsightItem["tone"]) {
  if (tone === "caution") return styles.toneCaution;
  if (tone === "normal") return styles.toneNormal;
  return styles.toneUnknown;
}

export function HealthLinkSummaryHero({
  checkupCount,
  cautionCount,
  medicationCount,
  showCheckupCount,
  showMedicationCount,
  summaryHeadline,
  summaryBody,
  summaryRiskLevel,
  summaryInsights,
}: HealthLinkSummaryHeroProps) {
  return (
    <section className={`${styles.compactSection} ${styles.summaryHeroSection}`}>
      <div className={styles.compactHeader}>
        <h3>{HEALTH_LINK_COPY.result.summaryTitle}</h3>
        <span
          className={`${styles.aiRiskBadge} ${resolveAiRiskClass(
            summaryRiskLevel
          )}`}
        >
          {resolveAiRiskLabel(summaryRiskLevel)}
        </span>
      </div>

      <p className={styles.summaryHeroHeadline}>{summaryHeadline}</p>
      <p className={styles.summaryHeroBody}>{summaryBody}</p>

      <div className={styles.summaryStatRow}>
        {showCheckupCount ? (
          <span className={styles.summaryStatPill}>
            검진 {checkupCount.toLocaleString("ko-KR")}개
          </span>
        ) : null}
        {showCheckupCount ? (
          <span className={`${styles.summaryStatPill} ${styles.summaryWarnPill}`}>
            주의 {cautionCount.toLocaleString("ko-KR")}개
          </span>
        ) : null}
        {showMedicationCount ? (
          <span className={styles.summaryStatPill}>
            투약 {medicationCount.toLocaleString("ko-KR")}건
          </span>
        ) : null}
      </div>

      {summaryInsights.length > 0 ? (
        <ul className={styles.summaryInsightList}>
          {summaryInsights.map((item, index) => (
            <li key={`${item.metric}-${item.value}-${index}`}>
              <div className={styles.summaryInsightTop}>
                <strong>{item.metric}</strong>
                <span
                  className={`${styles.metricTone} ${resolveInsightToneClass(
                    item.tone
                  )}`}
                >
                  {resolveInsightToneLabel(item.tone)}
                </span>
              </div>
              <p className={styles.summaryInsightValue}>{item.value}</p>
              <p className={styles.summaryInsightText}>{item.interpretation}</p>
              <p className={styles.summaryInsightTip}>{item.tip}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

