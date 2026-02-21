"use client";

import styles from "../HealthLinkClient.module.css";
import { HEALTH_LINK_COPY } from "../copy";
import { SpinnerLabel } from "./HealthLinkCommon";

type HealthLinkFetchActionsProps = {
  statusLinked: boolean;
  detailAlreadyLoaded: boolean;
  detailDisabled: boolean;
  forceRefreshDisabled: boolean;
  forceRefreshHint: string;
  primaryLoading: boolean;
  detailLoading: boolean;
  onFetchDetailed: () => void;
  onDetailFresh: () => void;
  onSummaryFresh: () => void;
};

export function HealthLinkFetchActions({
  statusLinked,
  detailAlreadyLoaded,
  detailDisabled,
  forceRefreshDisabled,
  forceRefreshHint,
  primaryLoading,
  detailLoading,
  onFetchDetailed,
  onDetailFresh,
  onSummaryFresh,
}: HealthLinkFetchActionsProps) {
  if (!statusLinked) return null;

  return (
    <>
      <div className={styles.detailActionRow}>
        <button
          type="button"
          onClick={onFetchDetailed}
          disabled={detailDisabled}
          className={styles.detailButton}
        >
          <SpinnerLabel loading={detailLoading} label={HEALTH_LINK_COPY.fetch.detailButton} />
        </button>
        <button
          type="button"
          onClick={onDetailFresh}
          disabled={forceRefreshDisabled}
          className={styles.ghostButton}
        >
          <SpinnerLabel loading={detailLoading} label={HEALTH_LINK_COPY.fetch.detailForceButton} />
        </button>
        <span className={styles.detailHint}>
          {detailAlreadyLoaded
            ? HEALTH_LINK_COPY.fetch.detailAlreadyLoadedHint
            : HEALTH_LINK_COPY.fetch.detailHint}
        </span>
      </div>

      <div className={styles.detailActionRow}>
        <button
          type="button"
          onClick={onSummaryFresh}
          disabled={forceRefreshDisabled}
          className={styles.ghostButton}
        >
          <SpinnerLabel loading={primaryLoading} label={HEALTH_LINK_COPY.fetch.summaryForceButton} />
        </button>
        <span className={styles.detailHint}>{forceRefreshHint}</span>
      </div>
    </>
  );
}
