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
  hasNhisSessionExpiredFailure,
  isNhisSessionExpiredError,
  resolveCheckupMetricTone,
  selectLatestCheckupRows,
  summarizeMedicationRows,
} from "./utils";
import {
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
    canRequest,
    canSign,
    canFetch,
    summaryFetchBlocked,
    summaryFetchBlockedMessage,
    showHealthInPrereqGuide,
    handleInit,
    handleSign,
    handleFetch,
    handleUnlink,
  } = useNhisHealthLink();

  const hasAuthRequested = !!(status?.pendingAuthReady || status?.hasStepData);
  const statusLinked = !!status?.linked;

  const basePrimaryFlow = resolvePrimaryFlow(statusLinked, hasAuthRequested);
  const hasFetchedResponse = fetched !== null;
  const hasPersistedSessionExpiredError = isNhisSessionExpiredError(
    status?.lastError?.code,
    status?.lastError?.message
  );
  const hasSessionExpiredSignal =
    hasPersistedSessionExpiredError ||
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
  const aiSummary = fetched?.normalized?.aiSummary ?? null;
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

  const primaryLoading = actionLoading === primaryFlow.kind;
  const primaryButtonLabel = shouldForceReauth
    ? HEALTH_LINK_COPY.action.retryAuth
    : resolvePrimaryButtonLabel(primaryFlow.kind === "fetch", hasFetchResult);
  const primaryDisabled =
    !canRequest ||
    (primaryFlow.kind === "sign" && !canSign) ||
    (primaryFlow.kind === "fetch" && !canFetch);

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

  const handleSwitchIdentity = () => {
    if (!canRequest) return;
    const shouldSwitch = window.confirm(
      HEALTH_LINK_COPY.action.switchIdentityConfirm
    );
    if (!shouldSwitch) return;
    void handleUnlink();
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
          primaryLoading={primaryLoading}
          fetchFailures={fetchFailures}
          hasFetchResult={hasFetchResult}
          latestCheckupRows={latestCheckupRows}
          latestCheckupMeta={latestCheckupMeta}
          medicationDigest={medicationDigest}
          aiSummary={aiSummary}
          onSummaryFetch={() => void handleFetch()}
          switchIdentityDisabled={!canRequest}
          onSwitchIdentity={handleSwitchIdentity}
        />
      ) : null}
    </div>
  );
}
