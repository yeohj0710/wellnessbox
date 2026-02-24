"use client";

import React from "react";
import type { NhisAiSummary, NhisFetchFailure } from "../types";
import { hasNhisSessionExpiredFailure, type LatestCheckupMeta, type MedicationDigest } from "../utils";
import { HEALTH_LINK_COPY } from "../copy";
import styles from "../HealthLinkClient.module.css";
import { HealthLinkFetchActions } from "./HealthLinkFetchActions";
import { HealthLinkResultContent } from "./HealthLinkResultContent";
import { HealthLinkResultFailureNotice } from "./HealthLinkResultFailureNotice";
import { HealthLinkResultLoadingPanel } from "./HealthLinkResultLoadingPanel";
import { isSkippableFailure, type LatestCheckupRow } from "./HealthLinkResultSection.helpers";

type HealthLinkResultSectionProps = {
  linked: boolean;
  canFetch: boolean;
  switchIdentityDisabled: boolean;
  fetchLoading: boolean;
  summaryFetchBlocked: boolean;
  summaryFetchBlockedMessage: string | null;
  primaryLoading: boolean;
  fetchFailures: NhisFetchFailure[];
  hasFetchResult: boolean;
  latestCheckupRows: LatestCheckupRow[];
  latestCheckupMeta: LatestCheckupMeta;
  medicationDigest: MedicationDigest;
  aiSummary: NhisAiSummary | null;
  onSummaryFetch: () => void;
  onSwitchIdentity: () => void;
};

export function HealthLinkResultSection({
  linked,
  canFetch,
  switchIdentityDisabled,
  fetchLoading,
  summaryFetchBlocked,
  summaryFetchBlockedMessage,
  primaryLoading,
  fetchFailures,
  hasFetchResult,
  latestCheckupRows,
  latestCheckupMeta,
  medicationDigest,
  aiSummary,
  onSummaryFetch,
  onSwitchIdentity,
}: HealthLinkResultSectionProps) {
  const hasCheckupRows = latestCheckupRows.length > 0;
  const hasMedicationRows = medicationDigest.totalRows > 0;
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
        <div className={styles.noticeInfo}>{HEALTH_LINK_COPY.result.linkRequired}</div>
      </article>
    );
  }

  return (
    <article className={styles.sectionCard} aria-busy={fetchLoading}>
      <div className={styles.sectionHeader}>
        <h2>{HEALTH_LINK_COPY.result.title}</h2>
      </div>
      <p className={styles.sectionLead}>
        필요한 결과만 먼저 정리해 드려요. 중요한 항목부터 차례로 확인해 주세요.
      </p>

      <HealthLinkFetchActions
        statusLinked={linked}
        summaryDisabled={!canFetch}
        switchIdentityDisabled={switchIdentityDisabled}
        hasFetchResult={hasFetchResult}
        primaryLoading={primaryLoading}
        onSummaryFetch={onSummaryFetch}
        onSwitchIdentity={onSwitchIdentity}
      />

      {fetchLoading ? (
        <HealthLinkResultLoadingPanel
          loadingElapsedLabel={loadingElapsedLabel}
          loadingStageMessage={loadingStageMessage}
          loadingProgressPercent={loadingProgressPercent}
        />
      ) : null}

      {summaryFetchBlocked && summaryFetchBlockedMessage ? (
        <div className={styles.noticeWarn} role="status">
          {summaryFetchBlockedMessage}
        </div>
      ) : null}

      {sessionExpiredBlocking ? (
        <div className={styles.noticeError} role="alert">
          {HEALTH_LINK_COPY.result.sessionExpiredTitle}
          <div className={styles.noticeLine}>
            {HEALTH_LINK_COPY.result.sessionExpiredGuide}
          </div>
        </div>
      ) : null}

      {showFailureNotice ? (
        <HealthLinkResultFailureNotice failures={visibleFailures} />
      ) : null}

      {hasFetchResult ? (
        <HealthLinkResultContent
          latestCheckupRows={latestCheckupRows}
          latestCheckupMeta={latestCheckupMeta}
          medicationDigest={medicationDigest}
          aiSummary={aiSummary}
        />
      ) : fetchFailures.length === 0 && !fetchLoading ? (
        <div className={styles.emptyPanel}>{HEALTH_LINK_COPY.result.empty}</div>
      ) : null}
    </article>
  );
}
