"use client";

import styles from "../HealthLinkClient.module.css";
import { HEALTH_LINK_COPY } from "../copy";
import { SpinnerLabel } from "./HealthLinkCommon";

type HealthLinkFetchActionsProps = {
  statusLinked: boolean;
  forceRefreshDisabled: boolean;
  fetchCacheHint: string | null;
  forceRefreshHint: string;
  primaryLoading: boolean;
  onSummaryFresh: () => void;
};

export function HealthLinkFetchActions({
  statusLinked,
  forceRefreshDisabled,
  fetchCacheHint,
  forceRefreshHint,
  primaryLoading,
  onSummaryFresh,
}: HealthLinkFetchActionsProps) {
  if (!statusLinked) return null;

  return (
    <>
      {fetchCacheHint ? <div className={styles.noticeInfo}>{fetchCacheHint}</div> : null}

      <details className={styles.advancedActionDetails}>
        <summary>{HEALTH_LINK_COPY.fetch.advancedSummary}</summary>
        <div className={styles.advancedActionBody}>
          <button
            type="button"
            onClick={onSummaryFresh}
            disabled={forceRefreshDisabled}
            className={styles.ghostButton}
          >
            <SpinnerLabel
              loading={primaryLoading}
              label={HEALTH_LINK_COPY.fetch.summaryForceButton}
            />
          </button>
          <p className={styles.detailHint}>{forceRefreshHint}</p>
        </div>
      </details>
    </>
  );
}

