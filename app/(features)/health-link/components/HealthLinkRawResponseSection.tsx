"use client";

import type { NhisFetchResponse } from "../types";
import styles from "../HealthLinkClient.module.css";
import { HEALTH_LINK_COPY } from "../copy";
import { RawJsonBlock } from "./HealthLinkCommon";

type NhisRawPayload = NhisFetchResponse["data"] extends infer T
  ? T extends { raw?: infer R }
    ? R
    : undefined
  : undefined;

type HealthLinkRawResponseSectionProps = {
  raw: NhisRawPayload | null | undefined;
};

export function HealthLinkRawResponseSection({ raw }: HealthLinkRawResponseSectionProps) {
  const hasRawData =
    raw?.checkupOverview !== undefined ||
    raw?.checkupList !== undefined ||
    raw?.checkupYearly !== undefined;
  if (!hasRawData) return null;

  return (
    <details className={styles.rawSection}>
      <summary>{HEALTH_LINK_COPY.raw.summary}</summary>
      <div className={styles.rawGrid}>
        {raw?.checkupOverview !== undefined ? (
          <RawJsonBlock title="검진 요약 원본" value={raw.checkupOverview} />
        ) : null}
        {raw?.checkupList !== undefined ? (
          <RawJsonBlock title="검진 목록 원본" value={raw.checkupList} />
        ) : null}
        {raw?.checkupYearly !== undefined ? (
          <RawJsonBlock title="검진 연도별 원본" value={raw.checkupYearly} />
        ) : null}
      </div>
    </details>
  );
}
