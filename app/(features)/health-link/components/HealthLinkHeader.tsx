"use client";

import { HEALTH_LINK_COPY } from "../copy";
import styles from "../HealthLinkClient.module.css";

export function HealthLinkHeader() {
  return (
    <header className={styles.headerCard}>
      <h1 className={styles.title}>{HEALTH_LINK_COPY.header.title}</h1>
      <p className={styles.description}>{HEALTH_LINK_COPY.header.description}</p>
    </header>
  );
}

