"use client";

import styles from "../HealthLinkClient.module.css";
import { HEALTH_LINK_COPY } from "../copy";
import { SpinnerLabel } from "./HealthLinkCommon";

type HealthLinkFetchActionsProps = {
  statusLinked: boolean;
  summaryDisabled: boolean;
  hasFetchResult: boolean;
  primaryLoading: boolean;
  onSummaryFetch: () => void;
};

export function HealthLinkFetchActions({
  statusLinked,
  summaryDisabled,
  hasFetchResult,
  primaryLoading,
  onSummaryFetch,
}: HealthLinkFetchActionsProps) {
  if (!statusLinked) return null;

  return (
    <div className={styles.primaryActionWrap}>
      <button
        type="button"
        onClick={onSummaryFetch}
        disabled={summaryDisabled}
        aria-busy={primaryLoading}
        className={styles.nextButton}
      >
        <SpinnerLabel
          loading={primaryLoading}
          label={
            hasFetchResult
              ? HEALTH_LINK_COPY.action.reload
              : HEALTH_LINK_COPY.action.fetchNow
          }
        />
      </button>
    </div>
  );
}
