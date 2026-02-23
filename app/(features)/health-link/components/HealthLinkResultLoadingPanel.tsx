"use client";

import { HEALTH_LINK_COPY } from "../copy";
import styles from "../HealthLinkClient.module.css";

type HealthLinkResultLoadingPanelProps = {
  loadingElapsedLabel: string;
  loadingStageMessage: string;
  loadingProgressPercent: number;
};

export function HealthLinkResultLoadingPanel({
  loadingElapsedLabel,
  loadingStageMessage,
  loadingProgressPercent,
}: HealthLinkResultLoadingPanelProps) {
  return (
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
      <p className={styles.loadingHint}>{HEALTH_LINK_COPY.result.loadingHint}</p>
    </section>
  );
}
