"use client";

import { getHyphenLoginOrgLabel } from "@/lib/shared/hyphen-login";
import type { NhisStatusResponse } from "../types";
import { HEALTH_LINK_COPY } from "../copy";
import { formatDateTime, mapTargetLabel, parseErrorMessage } from "../utils";
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
  const providerLabel = status?.provider === "HYPHEN_NHIS" ? "하이픈(NHIS)" : status?.provider ?? "-";
  const loginMethodLabel = status?.loginMethod === "EASY" ? "간편인증" : status?.loginMethod ?? "-";

  return (
    <details className={styles.statusDetails}>
      <summary>{HEALTH_LINK_COPY.statusMeta.detailSummary}</summary>
      <div className={styles.metaGrid}>
        <MetaField label="연동 여부" value={statusLinked ? "연동됨" : "미연동"} />
        <MetaField label="제공자" value={providerLabel} />
        <MetaField label="로그인 방식" value={loginMethodLabel} />
        <MetaField label="로그인 기관" value={getHyphenLoginOrgLabel(status?.loginOrgCd)} />
        <MetaField label="최근 연동" value={formatDateTime(status?.lastLinkedAt)} />
        <MetaField label="최근 조회" value={formatDateTime(status?.lastFetchedAt)} />
        <MetaField
          label="캐시 전체 건수"
          value={`${status?.cache?.totalEntries?.toLocaleString("ko-KR") ?? 0}`}
        />
        <MetaField
          label="캐시 유효 건수"
          value={`${status?.cache?.validEntries?.toLocaleString("ko-KR") ?? 0}`}
        />
        <MetaField
          label="캐시 최신 조회 시각"
          value={formatDateTime(status?.cache?.latestFetchedAt)}
        />
        <MetaField
          label="캐시 만료 시각"
          value={formatDateTime(status?.cache?.latestExpiresAt)}
        />
        <MetaField
          label="캐시 히트 수"
          value={`${status?.cache?.latestHitCount?.toLocaleString("ko-KR") ?? 0}`}
        />
        <MetaField
          label="최근 조회 시도"
          value={formatDateTime(status?.latestFetchAttemptAt)}
        />
        <MetaField
          label="강제 새로고침 쿨다운"
          value={`${status?.forceRefresh?.cooldownSeconds ?? 0}초`}
        />
        <MetaField
          label="강제 새로고침 남은 시간"
          value={`${forceRefreshRemainingSeconds.toLocaleString("ko-KR")}초`}
        />
        <MetaField
          label="강제 새로고침 가능 시각"
          value={formatDateTime(forceRefreshAvailableAt)}
        />
        <MetaField
          label="조회 예산 (기본)"
          value={
            status?.fetchBudget
              ? `${status.fetchBudget.fresh.used}/${status.fetchBudget.fresh.limit} (남음 ${status.fetchBudget.fresh.remaining})`
              : "-"
          }
        />
        <MetaField
          label="조회 예산 (강제)"
          value={
            status?.fetchBudget
              ? `${status.fetchBudget.forceRefresh.used}/${status.fetchBudget.forceRefresh.limit} (남음 ${status.fetchBudget.forceRefresh.remaining})`
              : "-"
          }
        />
        <MetaField
          label="조회 예산 윈도우"
          value={
            status?.fetchBudget
              ? `${status.fetchBudget.windowHours.toLocaleString("ko-KR")}시간`
              : "-"
          }
        />
        <MetaField
          label="타깃 정책"
          value={
            status?.targetPolicy?.highCostTargetsEnabled
              ? "고비용 타깃 포함"
              : "검진 타깃 전용"
          }
        />
        <MetaField
          label="허용 타깃"
          value={status?.targetPolicy?.allowedTargets?.map(mapTargetLabel).join(", ") || "-"}
        />
        <MetaField
          label="최근 오류"
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
