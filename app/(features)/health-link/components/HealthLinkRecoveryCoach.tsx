"use client";

import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import type { PrimaryFlow } from "../ui-types";
import type { NhisFetchFailure, NhisStatusResponse } from "../types";
import type { LatestCheckupMeta, MedicationDigest } from "../utils";
import { buildHealthLinkRecoveryCoach } from "../recovery-coach";
import styles from "../HealthLinkClient.module.css";

type HealthLinkRecoveryCoachProps = {
  status?: NhisStatusResponse["status"];
  primaryFlow?: PrimaryFlow;
  sessionExpired?: boolean;
  showHealthInPrereqGuide?: boolean;
  summaryFetchBlocked?: boolean;
  summaryFetchBlockedMessage?: string | null;
  fetchFailures?: NhisFetchFailure[];
  hasFetchResult?: boolean;
  latestCheckupMeta?: LatestCheckupMeta;
  medicationDigest?: MedicationDigest;
};

export function HealthLinkRecoveryCoach(props: HealthLinkRecoveryCoachProps) {
  const coach = buildHealthLinkRecoveryCoach(props);
  const toneClassName =
    coach.tone === "warn"
      ? styles.coachWarn
      : coach.tone === "success"
        ? styles.coachSuccess
        : styles.coachInfo;

  const content = (
    <section className={`${styles.coachCard} ${toneClassName}`} aria-live="polite">
      <div className={styles.coachHeader}>
        <span className={styles.coachBadge}>{coach.badge}</span>
        <strong className={styles.coachTitle}>{coach.title}</strong>
      </div>
      <p className={styles.coachBody}>{coach.body}</p>
      <ul className={styles.coachList}>
        {coach.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      {coach.footnote ? (
        <p className={styles.coachFootnote}>{coach.footnote}</p>
      ) : null}
    </section>
  );

  return (
    <BetaFeatureGate
      title="Beta 건강링크 복구 가이드"
      helper="새로 추가된 복구 코치는 필요할 때만 펼쳐보세요."
    >
      {content}
    </BetaFeatureGate>
  );
}
