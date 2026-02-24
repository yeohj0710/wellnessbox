"use client";

import styles from "../HealthLinkClient.module.css";
import { HEALTH_LINK_COPY } from "../copy";
import { SpinnerLabel } from "./HealthLinkCommon";

type HealthLinkFetchActionsProps = {
  statusLinked: boolean;
  summaryDisabled: boolean;
  switchIdentityDisabled: boolean;
  hasFetchResult: boolean;
  primaryLoading: boolean;
  onSummaryFetch: () => void;
  onSwitchIdentity: () => void;
};

export function HealthLinkFetchActions({
  statusLinked,
  summaryDisabled,
  switchIdentityDisabled,
  hasFetchResult,
  primaryLoading,
  onSummaryFetch,
  onSwitchIdentity,
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
      <details className={styles.secondaryActionDetails}>
        <summary>{HEALTH_LINK_COPY.action.moreOptions}</summary>
        <div className={styles.secondaryActionBody}>
          <button
            type="button"
            onClick={onSwitchIdentity}
            disabled={switchIdentityDisabled}
            className={styles.secondaryActionButton}
          >
            {HEALTH_LINK_COPY.action.switchIdentity}
          </button>
          <p className={styles.secondaryActionHint}>
            {HEALTH_LINK_COPY.result.switchIdentityHint}
          </p>
        </div>
      </details>
    </div>
  );
}
