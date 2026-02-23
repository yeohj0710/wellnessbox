"use client";

import React from "react";
import type { NhisFetchFailure } from "../types";
import {
  describeFetchFailure,
  formatDataCell,
  hasNhisSessionExpiredFailure,
  mapTargetLabel,
  type CheckupMetricTone,
  type LatestCheckupMeta,
  type MedicationDigest,
} from "../utils";
import { HEALTH_LINK_COPY } from "../copy";
import styles from "../HealthLinkClient.module.css";
import { HealthLinkFetchActions } from "./HealthLinkFetchActions";

type LatestCheckupRow = {
  metric?: string | null;
  value?: string | number | boolean | null;
  itemData?: string | number | boolean | null;
  normalA?: string | number | boolean | null;
  normalB?: string | number | boolean | null;
  suspicionDis?: string | number | boolean | null;
  statusTone: CheckupMetricTone;
};

type MetricGroupId =
  | "all"
  | "body"
  | "pressure"
  | "sugar"
  | "lab"
  | "sense"
  | "other";

type HealthLinkResultSectionProps = {
  linked: boolean;
  canFetch: boolean;
  fetchLoading: boolean;
  summaryFetchBlocked: boolean;
  summaryFetchBlockedMessage: string | null;
  fetchCacheHint: string | null;
  forceRefreshHint: string;
  forceRefreshDisabled: boolean;
  primaryLoading: boolean;
  fetchFailures: NhisFetchFailure[];
  hasFetchResult: boolean;
  latestCheckupRows: LatestCheckupRow[];
  latestCheckupMeta: LatestCheckupMeta;
  medicationDigest: MedicationDigest;
  onSummaryFetch: () => void;
  onSummaryFresh: () => void;
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

function resolveMetricGroupId(metric: string): Exclude<MetricGroupId, "all"> {
  const normalized = metric.toLowerCase().replace(/\s+/g, "");
  for (const group of METRIC_GROUPS) {
    if (group.pattern.test(normalized)) return group.id;
  }
  return "other";
}

function buildMetricGroups(rows: LatestCheckupRow[]) {
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

function renderMetricCards(rows: LatestCheckupRow[]) {
  return rows.map((row, index) => {
    const metric = typeof row.metric === "string" ? row.metric : "-";
    const value = formatDataCell(row.value ?? row.itemData ?? null);
    const tone = row.statusTone;
    const reference = [row.normalA, row.normalB, row.suspicionDis]
      .map((item) => formatDataCell(item))
      .filter((item) => item !== "-")
      .join(" | ");

    return (
      <article key={`${metric}-${value}-${index}`} className={styles.metricCardCompact}>
        <div className={styles.metricCardTop}>
          <strong>{metric}</strong>
          <span className={`${styles.metricTone} ${resolveToneClass(tone)}`}>
            {resolveToneLabel(tone)}
          </span>
        </div>
        <div className={styles.metricCardValue}>{value}</div>
        {reference ? <p className={styles.metricReference}>{reference}</p> : null}
      </article>
    );
  });
}

function isSkippableFailure(
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

function toFriendlyFailureMessage(failure: NhisFetchFailure) {
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

export function HealthLinkResultSection({
  linked,
  canFetch,
  fetchLoading,
  summaryFetchBlocked,
  summaryFetchBlockedMessage,
  fetchCacheHint,
  forceRefreshHint,
  forceRefreshDisabled,
  primaryLoading,
  fetchFailures,
  hasFetchResult,
  latestCheckupRows,
  latestCheckupMeta,
  medicationDigest,
  onSummaryFetch,
  onSummaryFresh,
}: HealthLinkResultSectionProps) {
  const hasCheckupRows = latestCheckupRows.length > 0;
  const hasMedicationRows = medicationDigest.totalRows > 0;
  const showMedicationSection = hasMedicationRows || !hasCheckupRows;
  const sessionExpiredFailure = hasNhisSessionExpiredFailure(fetchFailures);
  const sessionExpiredBlocking = sessionExpiredFailure && !hasFetchResult;

  const visibleFailures = fetchFailures.filter(
    (failure) =>
      !isSkippableFailure(failure, {
        hasAnyResult: hasFetchResult,
        hasCheckupRows,
        hasMedicationRows,
      })
  );
  const showFailureNotice = visibleFailures.length > 0 && !sessionExpiredBlocking;

  const cautionRows = latestCheckupRows.filter(
    (row) => row.statusTone === "caution"
  );
  const topMedicines = medicationDigest.topMedicines.slice(0, 4);
  const topConditions = medicationDigest.topConditions.slice(0, 4);
  const recentMedications = medicationDigest.recentMedications.slice(0, 5);
  const [fetchLoadingElapsedSec, setFetchLoadingElapsedSec] = React.useState(0);

  const groupedRows = React.useMemo(
    () => buildMetricGroups(latestCheckupRows),
    [latestCheckupRows]
  );

  const metricTabs = React.useMemo(() => {
    const tabs: Array<{ id: MetricGroupId; label: string; count: number }> = [
      {
        id: "all",
        label: "전체",
        count: latestCheckupRows.length,
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
  }, [groupedRows, latestCheckupRows.length]);

  const [activeGroup, setActiveGroup] = React.useState<MetricGroupId>("all");

  React.useEffect(() => {
    if (metricTabs.some((tab) => tab.id === activeGroup)) return;
    setActiveGroup("all");
  }, [activeGroup, metricTabs]);

  React.useEffect(() => {
    if (!fetchLoading) {
      setFetchLoadingElapsedSec(0);
      return;
    }
    setFetchLoadingElapsedSec(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setFetchLoadingElapsedSec(elapsed);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [fetchLoading]);

  const visibleRows =
    activeGroup === "all" ? latestCheckupRows : groupedRows[activeGroup];
  const loadingProgressPercent = Math.min(
    92,
    fetchLoadingElapsedSec < 10
      ? 20 + fetchLoadingElapsedSec * 5
      : fetchLoadingElapsedSec < 25
      ? 70 + (fetchLoadingElapsedSec - 10)
      : 86 + Math.floor((fetchLoadingElapsedSec - 25) / 6)
  );
  const loadingStageMessage =
    fetchLoadingElapsedSec < 8
      ? HEALTH_LINK_COPY.result.loadingStageInit
      : fetchLoadingElapsedSec < 20
      ? HEALTH_LINK_COPY.result.loadingStageFetch
      : HEALTH_LINK_COPY.result.loadingStageSlow;
  const loadingElapsedLabel = `${fetchLoadingElapsedSec}${HEALTH_LINK_COPY.result.loadingElapsedUnit}`;

  if (!linked) {
    return (
      <article className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>{HEALTH_LINK_COPY.result.title}</h2>
        </div>
        <div className={styles.noticeInfo}>{HEALTH_LINK_COPY.result.linkRequired}</div>
      </article>
    );
  }

  return (
    <article className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>{HEALTH_LINK_COPY.result.title}</h2>
      </div>
      <p className={styles.sectionLead}>
        필요한 결과만 먼저 정리해 드려요. 중요한 항목부터 차례로 확인해 주세요.
      </p>

      <HealthLinkFetchActions
        statusLinked={linked}
        summaryDisabled={!canFetch}
        hasFetchResult={hasFetchResult}
        forceRefreshDisabled={forceRefreshDisabled}
        fetchCacheHint={fetchCacheHint}
        forceRefreshHint={forceRefreshHint}
        primaryLoading={primaryLoading}
        onSummaryFetch={onSummaryFetch}
        onSummaryFresh={onSummaryFresh}
      />

      {fetchLoading ? (
        <section className={styles.loadingPanel} aria-live="polite">
          <div className={styles.loadingHeader}>
            <strong>{HEALTH_LINK_COPY.result.loadingTitle}</strong>
            <span>{loadingElapsedLabel}</span>
          </div>
          <p className={styles.loadingDescription}>{loadingStageMessage}</p>
          <div className={styles.loadingBarTrack}>
            <div
              className={styles.loadingBarFill}
              style={{ width: `${loadingProgressPercent}%` }}
            />
          </div>
          <div className={styles.loadingSkeletonGrid} aria-hidden>
            <div className={styles.loadingSkeletonCard} />
            <div className={styles.loadingSkeletonCard} />
            <div className={styles.loadingSkeletonCard} />
            <div className={styles.loadingSkeletonCard} />
          </div>
          <div className={styles.loadingSkeletonList} aria-hidden>
            <div className={styles.loadingSkeletonLine} />
            <div className={styles.loadingSkeletonLineShort} />
            <div className={styles.loadingSkeletonLine} />
          </div>
          <p className={styles.loadingHint}>
            {HEALTH_LINK_COPY.result.loadingHint}
          </p>
        </section>
      ) : null}

      {summaryFetchBlocked && summaryFetchBlockedMessage ? (
        <div className={styles.noticeWarn}>{summaryFetchBlockedMessage}</div>
      ) : null}

      {sessionExpiredBlocking ? (
        <div className={styles.noticeError}>
          {HEALTH_LINK_COPY.result.sessionExpiredTitle}
          <div className={styles.noticeLine}>
            {HEALTH_LINK_COPY.result.sessionExpiredGuide}
          </div>
        </div>
      ) : null}

      {showFailureNotice ? (
        <>
          <div className={styles.noticeInfo}>
            일부 항목은 아직 준비 중이에요. 핵심 결과는 먼저 보여드렸어요.
          </div>
          <details className={styles.statusDetails}>
            <summary>안내 자세히 보기</summary>
            <div className={styles.detailsBody}>
              <div className={styles.detailHint}>
                {visibleFailures.map((failure, index) => (
                  <div key={`${failure.target}-${index}`}>
                    {mapTargetLabel(failure.target)} -{" "}
                    {toFriendlyFailureMessage(failure)}
                  </div>
                ))}
              </div>
            </div>
          </details>
        </>
      ) : null}

      {hasFetchResult ? (
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
                <div className={styles.metricBoard}>
                  {renderMetricCards(visibleRows)}
                </div>
              ) : (
                <div className={styles.emptyHint}>표시할 검진 항목이 없습니다.</div>
              )}
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
                  이번에는 투약 이력을 먼저 확인했어요. 최근 복용 이력을 바탕으로 정리해 드려요.
                </p>
              ) : null}

              {medicationDigest.totalRows === 0 ? (
                <div className={styles.noticeInfo}>
                  이번에는 표시할 투약 이력이 없어요.
                </div>
              ) : (
                <div className={styles.medicationGrid}>
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

                  <div className={styles.medicationBlock}>
                    <strong>{HEALTH_LINK_COPY.result.recentMedicationTitle}</strong>
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
      ) : fetchFailures.length === 0 && !fetchLoading ? (
        <div className={styles.emptyPanel}>{HEALTH_LINK_COPY.result.empty}</div>
      ) : null}
    </article>
  );
}
