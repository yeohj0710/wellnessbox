"use client";

import { getHyphenLoginOrgLabel } from "@/lib/shared/hyphen-login";
import type { NhisStatusResponse } from "../types";
import { HEALTH_LINK_COPY } from "../copy";
import { formatDateTime, parseErrorMessage } from "../utils";
import styles from "../HealthLinkClient.module.css";
import { MetaField } from "./HealthLinkCommon";

type HealthLinkStatusMetaProps = {
  status: NhisStatusResponse["status"];
  statusLinked: boolean;
  forceRefreshRemainingSeconds: number;
  forceRefreshAvailableAt: string | null;
};

export function HealthLinkStatusMeta({
  status,
  statusLinked,
  forceRefreshRemainingSeconds,
  forceRefreshAvailableAt,
}: HealthLinkStatusMetaProps) {
  return (
    <details className={styles.statusDetails}>
      <summary>{HEALTH_LINK_COPY.statusMeta.detailSummary}</summary>
      <div className={styles.metaGrid}>
        <MetaField label="Linked" value={statusLinked ? "true" : "false"} />
        <MetaField label="Provider" value={status?.provider ?? "HYPHEN_NHIS"} />
        <MetaField label="Login Method" value={status?.loginMethod ?? "-"} />
        <MetaField label="Login Org" value={getHyphenLoginOrgLabel(status?.loginOrgCd)} />
        <MetaField label="Last Linked" value={formatDateTime(status?.lastLinkedAt)} />
        <MetaField label="Last Fetch" value={formatDateTime(status?.lastFetchedAt)} />
        <MetaField
          label="Cache Entries"
          value={`${status?.cache?.totalEntries?.toLocaleString("ko-KR") ?? 0}`}
        />
        <MetaField
          label="Cache Valid"
          value={`${status?.cache?.validEntries?.toLocaleString("ko-KR") ?? 0}`}
        />
        <MetaField
          label="Cache Latest"
          value={formatDateTime(status?.cache?.latestFetchedAt)}
        />
        <MetaField
          label="Cache Expires"
          value={formatDateTime(status?.cache?.latestExpiresAt)}
        />
        <MetaField
          label="Cache Hit Count"
          value={`${status?.cache?.latestHitCount?.toLocaleString("ko-KR") ?? 0}`}
        />
        <MetaField
          label="Latest Fetch Attempt"
          value={formatDateTime(status?.latestFetchAttemptAt)}
        />
        <MetaField
          label="Force Refresh Cooldown"
          value={`${status?.forceRefresh?.cooldownSeconds ?? 0}s`}
        />
        <MetaField
          label="Force Refresh Remaining"
          value={`${forceRefreshRemainingSeconds.toLocaleString("ko-KR")}s`}
        />
        <MetaField
          label="Force Refresh Available At"
          value={formatDateTime(forceRefreshAvailableAt)}
        />
        <MetaField
          label="Fetch Budget (Fresh)"
          value={
            status?.fetchBudget
              ? `${status.fetchBudget.fresh.used}/${status.fetchBudget.fresh.limit} (remaining ${status.fetchBudget.fresh.remaining})`
              : "-"
          }
        />
        <MetaField
          label="Fetch Budget (Force)"
          value={
            status?.fetchBudget
              ? `${status.fetchBudget.forceRefresh.used}/${status.fetchBudget.forceRefresh.limit} (remaining ${status.fetchBudget.forceRefresh.remaining})`
              : "-"
          }
        />
        <MetaField
          label="Fetch Budget Window"
          value={
            status?.fetchBudget
              ? `${status.fetchBudget.windowHours.toLocaleString("ko-KR")}h`
              : "-"
          }
        />
        <MetaField
          label="Target Policy"
          value={status?.targetPolicy?.highCostTargetsEnabled ? "high-cost-enabled" : "checkup-only"}
        />
        <MetaField
          label="Allowed Targets"
          value={status?.targetPolicy?.allowedTargets?.join(", ") || "-"}
        />
        <MetaField
          label="Last Error"
          value={
            status?.lastError?.message
              ? parseErrorMessage(
                  status.lastError.message,
                  HEALTH_LINK_COPY.statusMeta.lastErrorFallback
                )
              : "-"
          }
        />
      </div>
    </details>
  );
}
