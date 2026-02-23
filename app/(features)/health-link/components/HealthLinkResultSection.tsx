"use client";

import React from "react";
import type {
  NhisCheckupSummary,
  NhisFetchFailure,
  NhisFetchResponse,
} from "../types";
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
import { MetricCard } from "./HealthLinkCommon";
import { HealthLinkFetchActions } from "./HealthLinkFetchActions";
import { HealthLinkRawResponseSection } from "./HealthLinkRawResponseSection";

type LatestCheckupRow = {
  metric?: string | null;
  value?: string | number | boolean | null;
  itemData?: string | number | boolean | null;
  normalA?: string | number | boolean | null;
  normalB?: string | number | boolean | null;
  suspicionDis?: string | number | boolean | null;
  statusTone: CheckupMetricTone;
};

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
  checkupSummary: NhisCheckupSummary | undefined;
  raw: NhisFetchResponse["data"] extends infer T
    ? T extends { raw?: infer R }
      ? R | null | undefined
      : null | undefined
    : null | undefined;
  onSummaryFetch: () => void;
  onSummaryFresh: () => void;
};

function resolveToneLabel(tone: CheckupMetricTone) {
  if (tone === "normal") return HEALTH_LINK_COPY.result.statusNormal;
  if (tone === "caution") return HEALTH_LINK_COPY.result.statusCaution;
  return HEALTH_LINK_COPY.result.statusUnknown;
}

function resolveToneClass(tone: CheckupMetricTone) {
  if (tone === "normal") return styles.toneNormal;
  if (tone === "caution") return styles.toneCaution;
  return styles.toneUnknown;
}

function renderMetricRows(rows: LatestCheckupRow[]) {
  return rows.map((row, index) => {
    const metric = typeof row.metric === "string" ? row.metric : "-";
    const value = formatDataCell(row.value ?? row.itemData ?? null);
    const tone = row.statusTone;
    const reference = [row.normalA, row.normalB, row.suspicionDis]
      .map((item) => formatDataCell(item))
      .filter((item) => item !== "-")
      .join(" | ");

    return (
      <div key={`${metric}-${value}-${index}`} className={styles.metricRow}>
        <div className={styles.metricRowMain}>
          <strong>{metric}</strong>
          <span>{value}</span>
        </div>
        <div className={styles.metricRowMeta}>
          <span className={`${styles.metricTone} ${resolveToneClass(tone)}`}>
            {resolveToneLabel(tone)}
          </span>
          {reference ? <small>{reference}</small> : null}
        </div>
      </div>
    );
  });
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
  checkupSummary,
  raw,
  onSummaryFetch,
  onSummaryFresh,
}: HealthLinkResultSectionProps) {
  const sessionExpiredFailure = hasNhisSessionExpiredFailure(fetchFailures);
  const sessionExpiredBlocking = sessionExpiredFailure && !hasFetchResult;
  const cautionRows = latestCheckupRows.filter(
    (row) => row.statusTone === "caution"
  );
  const visibleCautionRows = cautionRows.slice(0, 6);
  const normalCount = latestCheckupRows.filter(
    (row) => row.statusTone === "normal"
  ).length;
  const unknownCount = latestCheckupRows.filter(
    (row) => row.statusTone === "unknown"
  ).length;
  const topMedicines = medicationDigest.topMedicines.slice(0, 3);
  const topConditions = medicationDigest.topConditions.slice(0, 3);
  const recentMedications = medicationDigest.recentMedications.slice(0, 4);
  const [fetchLoadingElapsedSec, setFetchLoadingElapsedSec] = React.useState(0);

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
        <p className={styles.sectionDescription}>
          {HEALTH_LINK_COPY.result.description}
        </p>
        <div className={styles.noticeInfo}>
          {HEALTH_LINK_COPY.result.linkRequired}
        </div>
      </article>
    );
  }

  return (
    <article className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>{HEALTH_LINK_COPY.result.title}</h2>
      </div>
      <p className={styles.sectionDescription}>
        {HEALTH_LINK_COPY.result.description}
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

      {fetchFailures.length > 0 ? (
        <>
          <div
            className={
              sessionExpiredBlocking ? styles.noticeError : styles.noticeWarn
            }
          >
            {sessionExpiredBlocking
              ? HEALTH_LINK_COPY.result.sessionExpiredTitle
              : HEALTH_LINK_COPY.result.partialFailureTitle}
            <div className={styles.noticeLine}>
              {sessionExpiredBlocking
                ? HEALTH_LINK_COPY.result.sessionExpiredGuide
                : HEALTH_LINK_COPY.result.partialFailureHint}
            </div>
          </div>
          {!sessionExpiredBlocking ? (
            <details className={styles.statusDetails}>
              <summary>
                {HEALTH_LINK_COPY.result.partialFailureDetailSummary}
              </summary>
              <div className={styles.detailsBody}>
                <div className={styles.detailHint}>
                  {fetchFailures.map((failure, index) => (
                    <div key={`${failure.target}-${index}`}>
                      {mapTargetLabel(failure.target)} -{" "}
                      {describeFetchFailure(failure)}
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ) : null}
        </>
      ) : null}

      {hasFetchResult ? (
        <>
          <div className={styles.metricGrid}>
            <MetricCard
              title={HEALTH_LINK_COPY.result.latestDateTitle}
              value={latestCheckupMeta.checkupDate ?? "-"}
              note={
                latestCheckupMeta.year ??
                HEALTH_LINK_COPY.result.latestDateFallback
              }
            />
            <MetricCard
              title={HEALTH_LINK_COPY.result.latestAgencyTitle}
              value={latestCheckupMeta.agency ?? "-"}
              note={HEALTH_LINK_COPY.result.latestAgencyNote}
            />
            <MetricCard
              title={HEALTH_LINK_COPY.result.latestOverallTitle}
              value={latestCheckupMeta.overallResult ?? "-"}
              note={HEALTH_LINK_COPY.result.latestOverallNote}
            />
            <MetricCard
              title={HEALTH_LINK_COPY.result.medicationCountTitle}
              value={`${medicationDigest.totalRows.toLocaleString("ko-KR")} ${
                HEALTH_LINK_COPY.table.rowUnit
              }`}
              note={`${
                HEALTH_LINK_COPY.result.medicationCountNotePrefix
              } ${medicationDigest.uniqueMedicineCount.toLocaleString(
                "ko-KR"
              )}`}
            />
          </div>

          <section className={styles.compactSection}>
            <div className={styles.compactHeader}>
              <h3>{HEALTH_LINK_COPY.result.cautionTitle}</h3>
              <span>{cautionRows.length.toLocaleString("ko-KR")}건</span>
            </div>
            {cautionRows.length === 0 ? (
              <div className={styles.noticeSuccess}>
                {HEALTH_LINK_COPY.result.cautionEmpty}
              </div>
            ) : (
              <div className={styles.metricList}>
                {renderMetricRows(visibleCautionRows)}
              </div>
            )}
            {cautionRows.length > visibleCautionRows.length ? (
              <p className={styles.detailHint}>
                {HEALTH_LINK_COPY.result.cautionLimitHint}
              </p>
            ) : null}
            <p className={styles.detailHint}>
              {HEALTH_LINK_COPY.result.statusNormal}{" "}
              {normalCount.toLocaleString("ko-KR")}건 ·{" "}
              {HEALTH_LINK_COPY.result.statusUnknown}{" "}
              {unknownCount.toLocaleString("ko-KR")}건
            </p>
          </section>

          {latestCheckupRows.length > 0 ? (
            <details className={styles.statusDetails}>
              <summary>
                {HEALTH_LINK_COPY.result.fullMetricsSummary} (
                {latestCheckupRows.length.toLocaleString("ko-KR")}
                {HEALTH_LINK_COPY.table.rowUnit})
              </summary>
              <div className={styles.detailsBody}>
                <div className={styles.metricList}>
                  {renderMetricRows(latestCheckupRows)}
                </div>
              </div>
            </details>
          ) : null}

          <section className={styles.compactSection}>
            <div className={styles.compactHeader}>
              <h3>{HEALTH_LINK_COPY.result.medicationSummaryTitle}</h3>
              <span>{HEALTH_LINK_COPY.result.medicationSummaryNote}</span>
            </div>
            {medicationDigest.totalRows === 0 ? (
              <div className={styles.emptyHint}>
                {HEALTH_LINK_COPY.result.medicationEmpty}
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
                  <strong>
                    {HEALTH_LINK_COPY.result.recentMedicationTitle}
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

          {checkupSummary?.recentLines &&
          checkupSummary.recentLines.length > 0 ? (
            <details className={styles.statusDetails}>
              <summary>{HEALTH_LINK_COPY.result.recentLinesSummary}</summary>
              <div className={styles.detailsBody}>
                <div className={styles.detailHint}>
                  {checkupSummary.recentLines.map((line, index) => (
                    <div key={`${index}-${line}`}>{line}</div>
                  ))}
                </div>
              </div>
            </details>
          ) : null}
        </>
      ) : fetchFailures.length === 0 && !fetchLoading ? (
        <div className={styles.emptyPanel}>{HEALTH_LINK_COPY.result.empty}</div>
      ) : null}

      <HealthLinkRawResponseSection raw={raw} />
    </article>
  );
}
