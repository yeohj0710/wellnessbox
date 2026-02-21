"use client";

import type { NhisCheckupSummary, NhisDataRow, NhisFetchFailure, NhisFetchResponse } from "../types";
import { describeFetchFailure, mapTargetLabel } from "../utils";
import { HEALTH_LINK_COPY } from "../copy";
import styles from "../HealthLinkClient.module.css";
import { DataTablePanel, MetricCard } from "./HealthLinkCommon";
import { HealthLinkFetchActions } from "./HealthLinkFetchActions";
import { HealthLinkRawResponseSection } from "./HealthLinkRawResponseSection";

type HealthLinkResultSectionProps = {
  linked: boolean;
  fetchCacheHint: string | null;
  showForceRefreshHint: boolean;
  forceRefreshHint: string;
  detailAlreadyLoaded: boolean;
  detailDisabled: boolean;
  forceRefreshDisabled: boolean;
  primaryLoading: boolean;
  detailLoading: boolean;
  fetchFailures: NhisFetchFailure[];
  hasFetchResult: boolean;
  checkupMetricRows: NhisDataRow[];
  checkupYearlyRows: NhisDataRow[];
  checkupOverviewRows: NhisDataRow[];
  checkupSummary: NhisCheckupSummary | undefined;
  displayRows: NhisDataRow[];
  raw: NhisFetchResponse["data"] extends infer T
    ? T extends { raw?: infer R }
      ? R | null | undefined
      : null | undefined
    : null | undefined;
  onFetchDetailed: () => void;
  onDetailFresh: () => void;
  onSummaryFresh: () => void;
};

export function HealthLinkResultSection({
  linked,
  fetchCacheHint,
  showForceRefreshHint,
  forceRefreshHint,
  detailAlreadyLoaded,
  detailDisabled,
  forceRefreshDisabled,
  primaryLoading,
  detailLoading,
  fetchFailures,
  hasFetchResult,
  checkupMetricRows,
  checkupYearlyRows,
  checkupOverviewRows,
  checkupSummary,
  displayRows,
  raw,
  onFetchDetailed,
  onDetailFresh,
  onSummaryFresh,
}: HealthLinkResultSectionProps) {
  return (
    <article className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>2. {HEALTH_LINK_COPY.result.title}</h2>
      </div>
      <p className={styles.sectionDescription}>{HEALTH_LINK_COPY.result.description}</p>

      <HealthLinkFetchActions
        statusLinked={linked}
        detailAlreadyLoaded={detailAlreadyLoaded}
        detailDisabled={detailDisabled}
        forceRefreshDisabled={forceRefreshDisabled}
        forceRefreshHint={forceRefreshHint}
        primaryLoading={primaryLoading}
        detailLoading={detailLoading}
        onFetchDetailed={onFetchDetailed}
        onDetailFresh={onDetailFresh}
        onSummaryFresh={onSummaryFresh}
      />

      {!linked ? (
        <div className={styles.noticeInfo}>{HEALTH_LINK_COPY.result.linkRequired}</div>
      ) : null}

      {fetchCacheHint ? <div className={styles.noticeInfo}>{fetchCacheHint}</div> : null}
      {showForceRefreshHint ? <div className={styles.noticeInfo}>{forceRefreshHint}</div> : null}

      {fetchFailures.length > 0 ? (
        <div className={styles.noticeWarn}>
          {HEALTH_LINK_COPY.result.partialFailureTitle}
          {fetchFailures.map((failure) => (
            <div key={failure.target} className={styles.noticeLine}>
              {mapTargetLabel(failure.target)} - {describeFetchFailure(failure)}
            </div>
          ))}
        </div>
      ) : null}

      {!hasFetchResult ? (
        <div className={styles.emptyPanel}>{HEALTH_LINK_COPY.result.empty}</div>
      ) : (
        <>
          <div className={styles.metricGrid}>
            <MetricCard
              title={HEALTH_LINK_COPY.result.metricRowsTitle}
              value={`${checkupMetricRows.length.toLocaleString("ko-KR")} rows`}
              note={HEALTH_LINK_COPY.result.metricRowsNote}
            />
            <MetricCard
              title={HEALTH_LINK_COPY.result.detailRowsTitle}
              value={`${checkupYearlyRows.length.toLocaleString("ko-KR")} rows`}
              note={HEALTH_LINK_COPY.result.detailRowsNote}
            />
            <MetricCard
              title={HEALTH_LINK_COPY.result.summaryRowsTitle}
              value={`${checkupOverviewRows.length.toLocaleString("ko-KR")} rows`}
              note={HEALTH_LINK_COPY.result.summaryRowsNote}
            />
          </div>

          {checkupMetricRows.length === 0 ? (
            <div className={styles.noticeInfo}>
              {HEALTH_LINK_COPY.result.limitedMetricInfo}
            </div>
          ) : null}

          <DataTablePanel
            title={HEALTH_LINK_COPY.result.tableTitle}
            rows={displayRows}
            summary={{
              totalCount: displayRows.length,
              recentLines: checkupSummary?.recentLines ?? [],
            }}
            emptyText={HEALTH_LINK_COPY.result.tableEmpty}
            maxRows={24}
          />
        </>
      )}

      <HealthLinkRawResponseSection raw={raw} />
    </article>
  );
}
