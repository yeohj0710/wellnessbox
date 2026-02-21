"use client";

import { getHyphenLoginOrgLabel } from "@/lib/shared/hyphen-login";
import { HEALTH_LINK_COPY } from "../copy";
import { formatDateTime } from "../utils";
import styles from "../HealthLinkClient.module.css";

type HealthLinkHeaderProps = {
  loggedIn: boolean;
  statusChipLabel: string;
  statusChipTone: string;
  loginOrgCd: string | null | undefined;
  lastLinkedAt: string | null | undefined;
};

export function HealthLinkHeader({
  loggedIn,
  statusChipLabel,
  statusChipTone,
  loginOrgCd,
  lastLinkedAt,
}: HealthLinkHeaderProps) {
  return (
    <>
      <header className={styles.headerCard}>
        <p className={styles.kicker}>HYPHEN CONNECT</p>
        <h1 className={styles.title}>{HEALTH_LINK_COPY.header.title}</h1>
        <p className={styles.description}>{HEALTH_LINK_COPY.header.description}</p>
        <div className={styles.statusRow}>
          <span className={`${styles.statusBadge} ${statusChipTone}`}>{statusChipLabel}</span>
          <span className={styles.infoPill}>Org {getHyphenLoginOrgLabel(loginOrgCd)}</span>
          <span className={styles.infoPill}>Last linked {formatDateTime(lastLinkedAt)}</span>
        </div>
      </header>

      {!loggedIn ? (
        <section className={styles.noticeCritical}>{HEALTH_LINK_COPY.header.signInRequired}</section>
      ) : null}
    </>
  );
}
