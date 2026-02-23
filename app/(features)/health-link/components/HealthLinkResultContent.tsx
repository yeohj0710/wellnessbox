"use client";

import React from "react";
import type { NhisAiSummary } from "../types";
import { HEALTH_LINK_COPY } from "../copy";
import type { LatestCheckupMeta, MedicationDigest } from "../utils";
import styles from "../HealthLinkClient.module.css";
import {
  buildMedicationAnalysisModel,
  buildMetricGroups,
  buildMetricTabs,
  normalizeCompactText,
  renderMetricCards,
  resolveAiRiskClass,
  resolveAiRiskLabel,
  type LatestCheckupRow,
  type MetricGroupId,
} from "./HealthLinkResultSection.helpers";

type HealthLinkResultContentProps = {
  latestCheckupRows: LatestCheckupRow[];
  latestCheckupMeta: LatestCheckupMeta;
  medicationDigest: MedicationDigest;
  aiSummary: NhisAiSummary | null;
};

export function HealthLinkResultContent({
  latestCheckupRows,
  latestCheckupMeta,
  medicationDigest,
  aiSummary,
}: HealthLinkResultContentProps) {
  const hasCheckupRows = latestCheckupRows.length > 0;
  const hasMedicationRows = medicationDigest.totalRows > 0;
  const showMedicationSection = hasMedicationRows || !hasCheckupRows;
  const cautionRows = latestCheckupRows.filter(
    (row) => row.statusTone === "caution"
  );
  const topMedicines = medicationDigest.topMedicines.slice(0, 4);
  const topConditions = medicationDigest.topConditions.slice(0, 4);
  const recentMedications = medicationDigest.recentMedications.slice(0, 5);
  const medicationOnlyMode = !hasCheckupRows && hasMedicationRows;
  const medicationAnalysis = React.useMemo(
    () => buildMedicationAnalysisModel(medicationDigest),
    [medicationDigest]
  );
  const compactMedicationSummaryMode =
    medicationOnlyMode && medicationDigest.totalRows <= 1;

  const hasAiSummary =
    !!aiSummary &&
    (aiSummary.summary.trim().length > 0 ||
      aiSummary.highlights.length > 0 ||
      aiSummary.nextSteps.length > 0);

  const groupedRows = React.useMemo(
    () => buildMetricGroups(latestCheckupRows),
    [latestCheckupRows]
  );

  const metricTabs = React.useMemo(
    () => buildMetricTabs(groupedRows, latestCheckupRows.length),
    [groupedRows, latestCheckupRows.length]
  );

  const [activeGroup, setActiveGroup] = React.useState<MetricGroupId>("all");

  React.useEffect(() => {
    if (metricTabs.some((tab) => tab.id === activeGroup)) return;
    setActiveGroup("all");
  }, [activeGroup, metricTabs]);

  const visibleRows =
    activeGroup === "all" ? latestCheckupRows : groupedRows[activeGroup];

  return (
    <>
      <section className={styles.resultOverview}>
        {hasCheckupRows ? (
          <article className={styles.overviewItem}>
            <span>검진 항목</span>
            <strong>{latestCheckupRows.length.toLocaleString("ko-KR")}개</strong>
          </article>
        ) : null}

        {hasCheckupRows ? (
          <article className={`${styles.overviewItem} ${styles.overviewWarn}`}>
            <span>주의 항목</span>
            <strong>{cautionRows.length.toLocaleString("ko-KR")}개</strong>
          </article>
        ) : null}

        {showMedicationSection ? (
          <article className={styles.overviewItem}>
            <span>투약 이력</span>
            <strong>{medicationDigest.totalRows.toLocaleString("ko-KR")}건</strong>
          </article>
        ) : null}
      </section>

      {hasAiSummary && aiSummary ? (
        <section className={`${styles.compactSection} ${styles.aiSummarySection}`}>
          <div className={styles.compactHeader}>
            <h3>AI 핵심 요약</h3>
            <span
              className={`${styles.aiRiskBadge} ${resolveAiRiskClass(
                aiSummary.riskLevel
              )}`}
            >
              {resolveAiRiskLabel(aiSummary.riskLevel)}
            </span>
          </div>
          <p className={styles.aiSummaryHeadline}>{aiSummary.headline}</p>
          <p className={styles.aiSummaryText}>{aiSummary.summary}</p>

          {aiSummary.highlights.length > 0 ? (
            <div className={styles.aiChipWrap}>
              {aiSummary.highlights.map((item, index) => (
                <span key={`${item}-${index}`} className={styles.aiHighlightChip}>
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          {aiSummary.nextSteps.length > 0 ? (
            <ul className={styles.aiActionList}>
              {aiSummary.nextSteps.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {hasCheckupRows && cautionRows.length > 0 ? (
        <section className={styles.compactSection}>
          <div className={styles.compactHeader}>
            <h3>{HEALTH_LINK_COPY.result.cautionTitle}</h3>
            <span>{cautionRows.length.toLocaleString("ko-KR")}개</span>
          </div>
          <p className={styles.sectionSubText}>
            생활 관리가 필요한 항목이에요. 최근 검사 기준으로 먼저 확인해 주세요.
          </p>
          <div className={styles.metricBoard}>
            {renderMetricCards(cautionRows.slice(0, 6))}
          </div>
        </section>
      ) : null}

      {hasCheckupRows ? (
        <section className={styles.compactSection}>
          <div className={styles.compactHeader}>
            <h3>검진 항목</h3>
            <span>
              {latestCheckupMeta.checkupDate
                ? `최근 검사 ${latestCheckupMeta.checkupDate}`
                : `${visibleRows.length.toLocaleString("ko-KR")}개 표시`}
            </span>
          </div>
          <p className={styles.sectionSubText}>
            복잡하지 않게 묶어서 보여드려요. 궁금한 항목만 골라서 확인해 보세요.
          </p>
          <div className={styles.metricFilterWrap}>
            {metricTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeGroup === tab.id}
                className={`${styles.metricFilterChip} ${
                  activeGroup === tab.id ? styles.metricFilterChipActive : ""
                }`}
                onClick={() => setActiveGroup(tab.id)}
              >
                {tab.label} {tab.count}
              </button>
            ))}
          </div>
          {visibleRows.length > 0 ? (
            <div className={styles.metricBoard}>{renderMetricCards(visibleRows)}</div>
          ) : (
            <div className={styles.emptyHint}>표시할 검진 항목이 없습니다.</div>
          )}
        </section>
      ) : null}

      {medicationOnlyMode ? (
        <section className={`${styles.compactSection} ${styles.medicationFocusSection}`}>
          <div className={styles.compactHeader}>
            <h3>복약 맞춤 분석</h3>
            <span>최근 1건 기준</span>
          </div>
          <p className={styles.sectionSubText}>
            건강검진 데이터가 없어도 최근 복약 이력을 기준으로 핵심만 빠르게 정리해
            드려요.
          </p>

          {medicationAnalysis.latestMedication ? (
            <article className={styles.medicationHeroCard}>
              <p className={styles.medicationHeroKicker}>가장 최근 복약</p>
              <strong className={styles.medicationHeroMedicine}>
                {medicationAnalysis.latestMedication.medicine}
              </strong>
              <p className={styles.medicationHeroMeta}>
                {normalizeCompactText(medicationAnalysis.latestMedication.date) ??
                  "날짜 정보 없음"}
              </p>
              <p className={styles.medicationHeroPurpose}>
                {medicationAnalysis.primaryPurpose
                  ? `복용 목적: ${medicationAnalysis.primaryPurpose}`
                  : "복용 목적 정보가 없어 약품명 중심으로 안내드려요."}
              </p>
            </article>
          ) : null}

          <div className={styles.medicationSummaryGrid}>
            {medicationAnalysis.summaryItems.map((item) => (
              <article key={item.label} className={styles.medicationSummaryCard}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <div className={styles.medicationInsightList}>
            {medicationAnalysis.insights.map((insight, index) => (
              <p key={`${insight}-${index}`}>{insight}</p>
            ))}
          </div>

          <ul className={styles.medicationActionList}>
            {medicationAnalysis.nextActions.map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showMedicationSection ? (
        <section className={styles.compactSection}>
          <div className={styles.compactHeader}>
            <h3>{HEALTH_LINK_COPY.result.medicationSummaryTitle}</h3>
            <span>{HEALTH_LINK_COPY.result.medicationSummaryNote}</span>
          </div>

          {!hasCheckupRows ? (
            <p className={styles.sectionSubText}>
              {medicationOnlyMode
                ? "아래에서 복약 이력 원본을 확인하실 수 있어요."
                : "이번에는 투약 이력 중심으로 확인되어 최근 복약 이력을 기반으로 정리해 드려요."}
            </p>
          ) : null}

          {medicationDigest.totalRows === 0 ? (
            <div className={styles.noticeInfo}>
              {HEALTH_LINK_COPY.result.medicationEmpty}
            </div>
          ) : (
            <div className={styles.medicationGrid}>
              {!compactMedicationSummaryMode ? (
                <div className={styles.medicationBlock}>
                  <strong>{HEALTH_LINK_COPY.result.topMedicineTitle}</strong>
                  <div className={styles.chipWrap}>
                    {topMedicines.length === 0 ? (
                      <span className={styles.emptyHint}>-</span>
                    ) : (
                      topMedicines.map((item) => (
                        <span key={item.label} className={styles.infoChip}>
                          {item.label} {item.count}건
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {!compactMedicationSummaryMode ? (
                <div className={styles.medicationBlock}>
                  <strong>{HEALTH_LINK_COPY.result.topConditionTitle}</strong>
                  <div className={styles.chipWrap}>
                    {topConditions.length === 0 ? (
                      <span className={styles.emptyHint}>-</span>
                    ) : (
                      topConditions.map((item) => (
                        <span key={item.label} className={styles.infoChip}>
                          {item.label} {item.count}건
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <div className={styles.medicationBlock}>
                <strong>
                  {compactMedicationSummaryMode
                    ? "복약 이력 원본"
                    : HEALTH_LINK_COPY.result.recentMedicationTitle}
                </strong>
                <div className={styles.recentMedicationList}>
                  {recentMedications.length === 0 ? (
                    <span className={styles.emptyHint}>-</span>
                  ) : (
                    recentMedications.map((item) => (
                      <div
                        key={`${item.date}-${item.medicine}`}
                        className={styles.recentMedicationItem}
                      >
                        <span>{item.date}</span>
                        <strong>{item.medicine}</strong>
                        <small>{item.effect ?? "-"}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
