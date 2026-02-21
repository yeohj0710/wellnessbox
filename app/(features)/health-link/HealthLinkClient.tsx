"use client";

import { HealthLinkAuthSection } from "./components/HealthLinkAuthSection";
import { HealthLinkHeader } from "./components/HealthLinkHeader";
import { HealthLinkResultSection } from "./components/HealthLinkResultSection";
import type { HealthLinkClientProps } from "./types";
import { useNhisHealthLink } from "./useNhisHealthLink";
import { filterCheckupMetricRows, formatDateTime } from "./utils";
import {
  buildForceRefreshConfirmMessage,
  resolveFetchCacheHint,
  resolveForceRefreshHint,
  resolvePrimaryButtonLabel,
  resolvePrimaryFlow,
  resolveStatusChip,
} from "./view-model";
import styles from "./HealthLinkClient.module.css";

export default function HealthLinkClient({ loggedIn }: HealthLinkClientProps) {
  const {
    status,
    statusError,
    statusLoading,
    resNm,
    setResNm,
    resNo,
    setResNo,
    mobileNo,
    setMobileNo,
    actionLoading,
    actionNotice,
    actionError,
    fetched,
    fetchFailures,
    fetchCacheInfo,
    canRequest,
    canSign,
    canFetch,
    hasDetailedRows,
    forceRefreshBlocked,
    forceRefreshRemainingSeconds,
    currentStep,
    showHealthInPrereqGuide,
    loadStatus,
    handleInit,
    handleSign,
    handleFetch,
    handleFetchFresh,
    handleFetchDetailed,
    handleFetchDetailedFresh,
    handleUnlink,
  } = useNhisHealthLink(loggedIn);

  const hasAuthRequested = !!(status?.pendingAuthReady || status?.hasStepData);
  const statusLinked = !!status?.linked;
  const statusChip = resolveStatusChip(statusLinked, hasAuthRequested);
  const statusChipTone =
    statusChip.tone === "on"
      ? styles.statusOn
      : statusChip.tone === "pending"
        ? styles.statusPending
        : styles.statusOff;

  const primaryFlow = resolvePrimaryFlow(statusLinked, hasAuthRequested);

  const checkupOverviewRows = fetched?.normalized?.checkup?.overview ?? [];
  const checkupListRows = fetched?.normalized?.checkup?.list ?? [];
  const checkupYearlyRows = fetched?.normalized?.checkup?.yearly ?? [];
  const checkupSummary = fetched?.normalized?.checkup?.summary;
  const metricSourceRows = [...checkupYearlyRows, ...checkupListRows, ...checkupOverviewRows];
  const checkupMetricRows = filterCheckupMetricRows(metricSourceRows);
  const displayRows = checkupMetricRows.length > 0 ? checkupMetricRows : checkupOverviewRows;
  const hasFetchResult = displayRows.length > 0;
  const fetchCacheHint = resolveFetchCacheHint(fetchCacheInfo, formatDateTime);

  const primaryLoading = actionLoading === primaryFlow.kind;
  const detailLoading = actionLoading === "fetchDetail";
  const primaryButtonLabel = resolvePrimaryButtonLabel(primaryFlow.kind === "fetch", hasFetchResult);
  const primaryDisabled =
    !loggedIn ||
    !canRequest ||
    (primaryFlow.kind === "sign" && !canSign) ||
    (primaryFlow.kind === "fetch" && !canFetch);
  const detailDisabled = !canFetch || !canRequest || hasDetailedRows;
  const forceRefreshAvailableAt = status?.forceRefresh?.availableAt ?? null;
  const forceRefreshBudgetRemaining = status?.fetchBudget?.forceRefresh.remaining ?? null;
  const forceRefreshBudgetLimit = status?.fetchBudget?.forceRefresh.limit ?? null;
  const forceRefreshBudgetWindowHours = status?.fetchBudget?.windowHours ?? null;
  const forceRefreshBudgetBlocked =
    typeof forceRefreshBudgetRemaining === "number" && forceRefreshBudgetRemaining <= 0;
  const forceRefreshDisabled =
    detailDisabled || forceRefreshBlocked || forceRefreshBudgetBlocked;
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
  const showForceRefreshHint = forceRefreshBlocked || forceRefreshBudgetBlocked;

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

  const confirmForceRefresh = (kind: "summary" | "detail") => {
    return window.confirm(buildForceRefreshConfirmMessage(kind));
  };

  const handleSummaryFreshAction = () => {
    if (forceRefreshBlocked || forceRefreshBudgetBlocked) return;
    if (!confirmForceRefresh("summary")) return;
    void handleFetchFresh();
  };

  const handleDetailFreshAction = () => {
    if (forceRefreshBlocked || forceRefreshBudgetBlocked) return;
    if (!confirmForceRefresh("detail")) return;
    void handleFetchDetailedFresh();
  };

  return (
    <div className={styles.page}>
      <HealthLinkHeader
        loggedIn={loggedIn}
        statusChipLabel={statusChip.label}
        statusChipTone={statusChipTone}
        loginOrgCd={status?.loginOrgCd}
        lastLinkedAt={status?.lastLinkedAt}
      />

      <HealthLinkAuthSection
        loggedIn={loggedIn}
        status={status}
        statusLinked={statusLinked}
        statusLoading={statusLoading}
        statusError={statusError}
        actionNotice={actionNotice}
        actionError={actionError}
        showHealthInPrereqGuide={showHealthInPrereqGuide}
        currentStep={currentStep}
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
        forceRefreshRemainingSeconds={forceRefreshRemainingSeconds}
        forceRefreshAvailableAt={forceRefreshAvailableAt}
        onRefreshStatus={() => void loadStatus()}
        onPrimaryAction={handlePrimaryAction}
        onUnlink={() => void handleUnlink()}
      />

      <HealthLinkResultSection
        linked={!!status?.linked}
        fetchCacheHint={fetchCacheHint}
        showForceRefreshHint={showForceRefreshHint}
        forceRefreshHint={forceRefreshHint}
        detailAlreadyLoaded={hasDetailedRows}
        detailDisabled={detailDisabled}
        forceRefreshDisabled={forceRefreshDisabled}
        primaryLoading={primaryLoading}
        detailLoading={detailLoading}
        fetchFailures={fetchFailures}
        hasFetchResult={hasFetchResult}
        checkupMetricRows={checkupMetricRows}
        checkupYearlyRows={checkupYearlyRows}
        checkupOverviewRows={checkupOverviewRows}
        checkupSummary={checkupSummary}
        displayRows={displayRows}
        raw={fetched?.raw}
        onFetchDetailed={() => void handleFetchDetailed()}
        onDetailFresh={handleDetailFreshAction}
        onSummaryFresh={handleSummaryFreshAction}
      />
    </div>
  );
}
