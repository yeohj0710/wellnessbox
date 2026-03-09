"use client";

import { useCallback, useMemo } from "react";
import { NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED } from "./constants";
import { HEALTH_LINK_COPY } from "./copy";
import type {
  ActionKind,
  NhisFetchFailure,
  NhisFetchResponse,
  NhisStatusResponse,
} from "./types";
import { isNhisSignReady } from "./useNhisHealthLink.helpers";
import {
  extractLatestCheckupMeta,
  filterCheckupMetricRows,
  hasNhisSessionExpiredFailure,
  isNhisSessionExpiredError,
  resolveCheckupMetricTone,
  selectLatestCheckupRows,
  summarizeMedicationRows,
} from "./utils";
import { resolvePrimaryButtonLabel, resolvePrimaryFlow } from "./view-model";

type UseHealthLinkClientModelInput = {
  status: NhisStatusResponse["status"] | undefined;
  fetched: NhisFetchResponse["data"] | null;
  fetchFailures: NhisFetchFailure[];
  actionLoading: ActionKind;
  actionErrorCode: string | null;
  canRequest: boolean;
  canSign: boolean;
  canFetch: boolean;
  handleInit: () => Promise<void>;
  handleSign: () => Promise<void>;
  handleFetch: () => Promise<void>;
  handleUnlink: () => Promise<void>;
};

export function useHealthLinkClientModel({
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
}: UseHealthLinkClientModelInput) {
  const hasAuthRequested = isNhisSignReady(status);
  const statusLinked = !!status?.linked;

  const basePrimaryFlow = useMemo(
    () => resolvePrimaryFlow(statusLinked, hasAuthRequested),
    [hasAuthRequested, statusLinked]
  );

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

  const primaryFlow = useMemo(
    () =>
      shouldForceReauth
        ? ({
            kind: "init" as const,
            step: 1,
            title: HEALTH_LINK_COPY.flow.reauth.title,
            guide: HEALTH_LINK_COPY.flow.reauth.guide,
          } as const)
        : basePrimaryFlow,
    [basePrimaryFlow, shouldForceReauth]
  );

  const checkupOverviewRows = fetched?.normalized?.checkup?.overview ?? [];
  const medicationRows = fetched?.normalized?.medication?.list ?? [];
  const aiSummary = fetched?.normalized?.aiSummary ?? null;
  const checkupMetricRows = filterCheckupMetricRows(checkupOverviewRows);
  const latestCheckupRows = useMemo(
    () =>
      selectLatestCheckupRows(checkupMetricRows).map((row) => ({
        ...row,
        statusTone: resolveCheckupMetricTone(row),
      })),
    [checkupMetricRows]
  );
  const latestCheckupMeta = useMemo(
    () => extractLatestCheckupMeta(selectLatestCheckupRows(checkupOverviewRows)),
    [checkupOverviewRows]
  );
  const medicationDigest = useMemo(
    () => summarizeMedicationRows(medicationRows),
    [medicationRows]
  );
  const hasFetchResult =
    latestCheckupRows.length > 0 || medicationRows.length > 0;

  const primaryLoading = actionLoading === primaryFlow.kind;
  const primaryButtonLabel = shouldForceReauth
    ? HEALTH_LINK_COPY.action.retryAuth
    : resolvePrimaryButtonLabel(primaryFlow.kind, hasFetchResult);
  const primaryDisabled =
    !canRequest ||
    (primaryFlow.kind === "sign" && !canSign) ||
    (primaryFlow.kind === "fetch" && !canFetch);

  const handlePrimaryAction = useCallback(() => {
    if (primaryFlow.kind === "init") {
      void handleInit();
      return;
    }
    if (primaryFlow.kind === "sign") {
      void handleSign();
      return;
    }
    void handleFetch();
  }, [handleFetch, handleInit, handleSign, primaryFlow.kind]);

  const handleSwitchIdentity = useCallback(() => {
    if (!canRequest) return;
    const shouldSwitch = window.confirm(
      HEALTH_LINK_COPY.action.switchIdentityConfirm
    );
    if (!shouldSwitch) return;
    void handleUnlink();
  }, [canRequest, handleUnlink]);

  return {
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
  };
}
