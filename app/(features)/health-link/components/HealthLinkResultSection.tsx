"use client";

import React from "react";
import { useToast } from "@/components/common/toastContext.client";
import type { NhisAiSummary, NhisFetchFailure } from "../types";
import { hasNhisSessionExpiredFailure, type LatestCheckupMeta, type MedicationDigest } from "../utils";
import { HEALTH_LINK_COPY } from "../copy";
import styles from "../HealthLinkClient.module.css";
import { HealthLinkFetchActions } from "./HealthLinkFetchActions";
import { HealthLinkResultContent } from "./HealthLinkResultContent";
import { HealthLinkResultFailureNotice } from "./HealthLinkResultFailureNotice";
import { HealthLinkResultLoadingPanel } from "./HealthLinkResultLoadingPanel";
import { type LatestCheckupRow } from "./HealthLinkResultSection.helpers";
import { useHealthLinkResultSectionModel } from "./useHealthLinkResultSectionModel";

type HealthLinkResultSectionProps = {
  linked: boolean;
  canFetch: boolean;
  switchIdentityDisabled: boolean;
  fetchLoading: boolean;
  summaryFetchBlocked: boolean;
  summaryFetchBlockedMessage: string | null;
  primaryLoading: boolean;
  fetchFailures: NhisFetchFailure[];
  hasFetchResult: boolean;
  latestCheckupRows: LatestCheckupRow[];
  latestCheckupMeta: LatestCheckupMeta;
  medicationDigest: MedicationDigest;
  aiSummary: NhisAiSummary | null;
  onSummaryFetch: () => void;
  onSwitchIdentity: () => void;
};

export function HealthLinkResultSection({
  linked,
  canFetch,
  switchIdentityDisabled,
  fetchLoading,
  summaryFetchBlocked,
  summaryFetchBlockedMessage,
  primaryLoading,
  fetchFailures,
  hasFetchResult,
  latestCheckupRows,
  latestCheckupMeta,
  medicationDigest,
  aiSummary,
  onSummaryFetch,
  onSwitchIdentity,
}: HealthLinkResultSectionProps) {
  const { showToast } = useToast();
  const lastSummaryBlockedMessageRef = React.useRef<string | null>(null);
  const sessionExpiredNotifiedRef = React.useRef(false);
  const lastFailureDigestRef = React.useRef<string | null>(null);
  const {
    sessionExpiredBlocking,
    visibleFailures,
    showFailureNotice,
    loadingElapsedLabel,
    loadingStageMessage,
    loadingProgressPercent,
  } = useHealthLinkResultSectionModel({
    fetchLoading,
    fetchFailures,
    hasFetchResult,
    latestCheckupRows,
    medicationDigest,
    aiSummary,
  });

  React.useEffect(() => {
    if (!summaryFetchBlocked || !summaryFetchBlockedMessage) return;
    if (lastSummaryBlockedMessageRef.current === summaryFetchBlockedMessage) return;
    lastSummaryBlockedMessageRef.current = summaryFetchBlockedMessage;
    showToast(summaryFetchBlockedMessage, { type: "info", duration: 3600 });
  }, [showToast, summaryFetchBlocked, summaryFetchBlockedMessage]);

  React.useEffect(() => {
    if (sessionExpiredBlocking) {
      if (sessionExpiredNotifiedRef.current) return;
      sessionExpiredNotifiedRef.current = true;
      showToast(HEALTH_LINK_COPY.result.sessionExpiredGuide, {
        type: "error",
        duration: 5200,
      });
      return;
    }
    sessionExpiredNotifiedRef.current = false;
  }, [sessionExpiredBlocking, showToast]);

  React.useEffect(() => {
    if (!showFailureNotice || visibleFailures.length === 0) return;
    const digest = visibleFailures
      .map((failure) => `${failure.target}:${failure.errCd ?? ""}:${failure.errMsg ?? ""}`)
      .join("|");
    if (!digest || lastFailureDigestRef.current === digest) return;
    lastFailureDigestRef.current = digest;
    showToast("일부 항목 결과는 준비 중입니다. 상세 안내를 확인해 주세요.", {
      type: "info",
      duration: 3600,
    });
  }, [showFailureNotice, showToast, visibleFailures]);

  if (!linked) {
    return (
      <article className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>{HEALTH_LINK_COPY.result.title}</h2>
        </div>
        <div className={styles.emptyPanel}>{HEALTH_LINK_COPY.result.linkRequired}</div>
      </article>
    );
  }

  return (
    <article className={styles.sectionCard} aria-busy={fetchLoading}>
      <div className={styles.sectionHeader}>
        <h2>{HEALTH_LINK_COPY.result.title}</h2>
      </div>
      <p className={styles.sectionLead}>{HEALTH_LINK_COPY.result.description}</p>

      <HealthLinkFetchActions
        statusLinked={linked}
        summaryDisabled={!canFetch}
        switchIdentityDisabled={switchIdentityDisabled}
        hasFetchResult={hasFetchResult}
        primaryLoading={primaryLoading}
        onSummaryFetch={onSummaryFetch}
        onSwitchIdentity={onSwitchIdentity}
      />

      {fetchLoading ? (
        <HealthLinkResultLoadingPanel
          loadingElapsedLabel={loadingElapsedLabel}
          loadingStageMessage={loadingStageMessage}
          loadingProgressPercent={loadingProgressPercent}
        />
      ) : null}

      {showFailureNotice ? (
        <HealthLinkResultFailureNotice failures={visibleFailures} />
      ) : null}

      {hasFetchResult ? (
        <HealthLinkResultContent
          latestCheckupRows={latestCheckupRows}
          latestCheckupMeta={latestCheckupMeta}
          medicationDigest={medicationDigest}
          aiSummary={aiSummary}
        />
      ) : fetchFailures.length === 0 && !fetchLoading ? (
        <div className={styles.emptyPanel}>{HEALTH_LINK_COPY.result.empty}</div>
      ) : null}
    </article>
  );
}
