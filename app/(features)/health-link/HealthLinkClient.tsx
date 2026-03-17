"use client";

import { HealthLinkAuthSection } from "./components/HealthLinkAuthSection";
import { HealthLinkHeader } from "./components/HealthLinkHeader";
import { HealthLinkResultSection } from "./components/HealthLinkResultSection";
import type { HealthLinkClientProps } from "./types";
import { useNhisHealthLink } from "./useNhisHealthLink";
import { useHealthLinkClientModel } from "./useHealthLinkClientModel";
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

  const {
    showAuthStage,
    shouldForceReauth,
    primaryFlow,
    latestCheckupRows,
    latestCheckupMeta,
    medicationDigest,
    aiSummary,
    hasFetchResult,
    primaryLoading,
    primaryButtonLabel,
    primaryDisabled,
    handlePrimaryAction,
    handleSwitchIdentity,
  } = useHealthLinkClientModel({
    status,
    fetched,
    fetchFailures,
    actionLoading,
    actionErrorCode,
    canRequest,
    canSign,
    canFetch,
    handleInit,
    handleSign,
    handleFetch,
    handleUnlink,
  });

  return (
    <div className={styles.page}>
      <HealthLinkHeader />

      {showAuthStage ? (
        <HealthLinkAuthSection
          loggedIn={loggedIn}
          status={status}
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
          status={status}
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
