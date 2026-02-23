"use client";

import { getHyphenLoginOrgLabel } from "@/lib/shared/hyphen-login";
import { HEALTH_LINK_COPY } from "../copy";
import { formatDateTime } from "../utils";
import styles from "../HealthLinkClient.module.css";

type HealthLinkHeaderProps = {
  statusChipLabel: string;
  statusChipTone: string;
  loginOrgCd: string | null | undefined;
  lastLinkedAt: string | null | undefined;
  showResultMode: boolean;
};

export function HealthLinkHeader({
  statusChipLabel,
  statusChipTone,
  loginOrgCd,
  lastLinkedAt,
  showResultMode,
}: HealthLinkHeaderProps) {
  return (
    <>
      <header className={styles.headerCard}>
        <p className={styles.kicker}>
          {showResultMode
            ? HEALTH_LINK_COPY.header.resultKicker
            : HEALTH_LINK_COPY.header.authKicker}
        </p>
        <h1 className={styles.title}>{HEALTH_LINK_COPY.header.title}</h1>
        <p className={styles.description}>
          {HEALTH_LINK_COPY.header.description}
        </p>
        {showResultMode ? (
          <div className={styles.statusRow}>
            <span className={`${styles.statusBadge} ${statusChipTone}`}>
              {statusChipLabel}
            </span>
            <span className={styles.infoPill}>
              기관 {getHyphenLoginOrgLabel(loginOrgCd)}
            </span>
            <span className={styles.infoPill}>
              최근 연동 {formatDateTime(lastLinkedAt)}
            </span>
          </div>
        ) : null}
      </header>
    </>
  );
}
