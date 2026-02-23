"use client";

import { HealthLinkAuthSection } from "./components/HealthLinkAuthSection";
import { HealthLinkHeader } from "./components/HealthLinkHeader";
import { HealthLinkResultSection } from "./components/HealthLinkResultSection";
import { NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED } from "./constants";
import { HEALTH_LINK_COPY } from "./copy";
import type { HealthLinkClientProps } from "./types";
import { useNhisHealthLink } from "./useNhisHealthLink";
import {
  extractLatestCheckupMeta,
  filterCheckupMetricRows,
  formatDateTime,
  hasNhisSessionExpiredFailure,
  resolveCheckupMetricTone,
  selectLatestCheckupRows,
  summarizeMedicationRows,
} from "./utils";
import {
  buildForceRefreshConfirmMessage,
  resolveFetchCacheHint,
  resolveForceRefreshHint,
  resolvePrimaryButtonLabel,
  resolvePrimaryFlow,
} from "./view-model";
import styles from "./HealthLinkClient.module.css";

export default function HealthLinkClient({ loggedIn }: HealthLinkClientProps) {
  const {
    status,
    statusError,
    resNm,
    setResNm,
    resNo,
    setResNo,
    mobileNo,
    setMobileNo,
    actionLoading,
    actionNotice,
    actionError,
    actionErrorCode,
    fetched,
    fetchFailures,
    fetchCacheInfo,
    canRequest,
    canSign,
    canFetch,
    summaryFetchBlocked,
    summaryFetchBlockedMessage,
    forceRefreshBlocked,
    forceRefreshRemainingSeconds,
    showHealthInPrereqGuide,
    handleInit,
    handleSign,
    handleFetch,
    handleFetchFresh,
    handleUnlink,
  } = useNhisHealthLink();

  const hasAuthRequested = !!(status?.pendingAuthReady || status?.hasStepData);
  const statusLinked = !!status?.linked;

  const basePrimaryFlow = resolvePrimaryFlow(statusLinked, hasAuthRequested);
  const hasFetchedResponse = fetched !== null;
  const hasSessionExpiredSignal =
    actionErrorCode === NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED ||
    hasNhisSessionExpiredFailure(fetchFailures);
  const shouldForceReauth = hasSessionExpiredSignal && !hasFetchedResponse;
  const showAuthStage = !statusLinked || shouldForceReauth;
  const primaryFlow = shouldForceReauth
    ? ({
        kind: "init" as const,
        step: 1,
        title: HEALTH_LINK_COPY.flow.reauth.title,
        guide: HEALTH_LINK_COPY.flow.reauth.guide,
      } as const)
    : basePrimaryFlow;

  const checkupOverviewRows = fetched?.normalized?.checkup?.overview ?? [];
  const medicationRows = fetched?.normalized?.medication?.list ?? [];
  const metricSourceRows = checkupOverviewRows;
  const checkupMetricRows = filterCheckupMetricRows(metricSourceRows);
  const latestCheckupRows = selectLatestCheckupRows(checkupMetricRows).map(
    (row) => ({
      ...row,
      statusTone: resolveCheckupMetricTone(row),
    })
  );
  const latestCheckupMeta = extractLatestCheckupMeta(
    selectLatestCheckupRows(checkupOverviewRows)
  );
  const medicationDigest = summarizeMedicationRows(medicationRows);
  const hasFetchResult =
    latestCheckupRows.length > 0 || medicationRows.length > 0;
  const fetchCacheHint = resolveFetchCacheHint(fetchCacheInfo, formatDateTime);

  const primaryLoading = actionLoading === primaryFlow.kind;
  const primaryButtonLabel = shouldForceReauth
    ? HEALTH_LINK_COPY.action.retryAuth
    : resolvePrimaryButtonLabel(primaryFlow.kind === "fetch", hasFetchResult);
  const primaryDisabled =
    !canRequest ||
    (primaryFlow.kind === "sign" && !canSign) ||
    (primaryFlow.kind === "fetch" && !canFetch);
  const forceRefreshAvailableAt = status?.forceRefresh?.availableAt ?? null;
  const forceRefreshBudgetRemaining =
    status?.fetchBudget?.forceRefresh.remaining ?? null;
  const forceRefreshBudgetLimit =
    status?.fetchBudget?.forceRefresh.limit ?? null;
  const forceRefreshBudgetWindowHours =
    status?.fetchBudget?.windowHours ?? null;
  const forceRefreshBudgetBlocked =
    typeof forceRefreshBudgetRemaining === "number" &&
    forceRefreshBudgetRemaining <= 0;
  const forceRefreshDisabled =
    !canFetch ||
    !canRequest ||
    forceRefreshBlocked ||
    forceRefreshBudgetBlocked;
  const forceRefreshHint = resolveForceRefreshHint(
    forceRefreshBlocked,
    forceRefreshRemainingSeconds,
    forceRefreshAvailableAt,
    {
      remaining: forceRefreshBudgetRemaining,
      limit: forceRefreshBudgetLimit,
      windowHours: forceRefreshBudgetWindowHours,
    },
    formatDateTime
  );

  const handlePrimaryAction = () => {
    if (primaryFlow.kind === "init") {
      void handleInit();
      return;
    }
    if (primaryFlow.kind === "sign") {
      void handleSign();
      return;
    }
    void handleFetch();
  };

  const confirmForceRefresh = () => {
    return window.confirm(buildForceRefreshConfirmMessage("summary"));
  };

  const handleSummaryFreshAction = () => {
    if (forceRefreshBlocked || forceRefreshBudgetBlocked) return;
    if (!confirmForceRefresh()) return;
    void handleFetchFresh();
  };

  return (
    <div className={styles.page}>
      <HealthLinkHeader />

      {showAuthStage ? (
        <HealthLinkAuthSection
          loggedIn={loggedIn}
          statusError={statusError}
          actionNotice={actionNotice}
          actionError={actionError}
          actionErrorCode={actionErrorCode}
          sessionExpired={shouldForceReauth}
          showHealthInPrereqGuide={showHealthInPrereqGuide}
          primaryFlow={primaryFlow}
          canRequest={canRequest}
          primaryDisabled={primaryDisabled}
          primaryLoading={primaryLoading}
          primaryButtonLabel={primaryButtonLabel}
          resNm={resNm}
          setResNm={setResNm}
          resNo={resNo}
          setResNo={setResNo}
          mobileNo={mobileNo}
          setMobileNo={setMobileNo}
          onPrimaryAction={handlePrimaryAction}
          onUnlink={() => void handleUnlink()}
        />
      ) : null}

      {!showAuthStage ? (
        <HealthLinkResultSection
          linked={!!status?.linked}
          canFetch={canFetch}
          fetchLoading={actionLoading === "fetch"}
          summaryFetchBlocked={summaryFetchBlocked}
          summaryFetchBlockedMessage={summaryFetchBlockedMessage}
          fetchCacheHint={fetchCacheHint}
          forceRefreshHint={forceRefreshHint}
          forceRefreshDisabled={forceRefreshDisabled}
          primaryLoading={primaryLoading}
          fetchFailures={fetchFailures}
          hasFetchResult={hasFetchResult}
          latestCheckupRows={latestCheckupRows}
          latestCheckupMeta={latestCheckupMeta}
          medicationDigest={medicationDigest}
          onSummaryFetch={() => void handleFetch()}
          onSummaryFresh={handleSummaryFreshAction}
        />
      ) : null}
    </div>
  );
}
