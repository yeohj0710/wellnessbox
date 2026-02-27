"use client";

import { useCallback, useState } from "react";
import {
  NHIS_ERR_CODE_HEALTHIN_REQUIRED,
  NHIS_LOGIN_ORG,
} from "./constants";
import { HEALTH_LINK_COPY } from "./copy";
import type {
  ActionKind,
  NhisActionResponse,
} from "./types";
import {
  resolveInitSuccessNotice,
  resolveSignSuccessNotice,
  validateInitIdentityInput,
} from "./useNhisHealthLink.helpers";
import { useNhisSummaryAutoFetch } from "./useNhisSummaryAutoFetch";
import { useNhisActionRequest } from "./useNhisActionRequest";
import {
  clearLocalNhisFetchData,
} from "./local-fetch-cache";
import { useNhisSummaryFetchState } from "./useNhisHealthLink.summaryFetchState";
import { useNhisStatusState } from "./useNhisHealthLink.status";

export function useNhisHealthLink() {
  const { status, statusError, setStatusError, patchStatus, loadStatus } =
    useNhisStatusState();

  const [resNm, setResNm] = useState("");
  const [resNo, setResNo] = useState("");
  const [mobileNo, setMobileNo] = useState("");

  const [actionLoading, setActionLoading] = useState<ActionKind>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionErrorCode, setActionErrorCode] = useState<string | null>(null);
  const canRequest = actionLoading === null;
  const canSign = canRequest && !!(status?.pendingAuthReady || status?.hasStepData);

  const { runRequest } = useNhisActionRequest({
    canRequest,
    loadStatus,
    setActionLoading,
    setActionNotice,
    setActionError,
    setActionErrorCode,
  });

  const {
    fetched,
    setFetched,
    fetchedFromLocalCache,
    setFetchedFromLocalCache,
    fetchFailures,
    setFetchFailures,
    summaryFetchBlocked,
    summaryFetchBlockedMessage,
    restoreFetchedFromLocalCache,
    runSummaryFetch,
  } = useNhisSummaryFetchState({
    status,
    loadStatus,
    runRequest,
    setActionNotice,
    setActionErrorCode,
    setActionError,
    setStatusError,
  });

  const canFetch = canRequest && !!status?.linked && !summaryFetchBlocked;

  const { requestAutoFetchAfterSign } = useNhisSummaryAutoFetch({
    actionLoading,
    status,
    fetched,
    fetchedFromLocalCache,
    summaryFetchBlocked,
    actionErrorCode,
    actionError,
    setActionNotice,
    setActionErrorCode,
    setActionError,
    runSummaryFetch,
  });

  const handleInit = useCallback(async () => {
    const validationError = validateInitIdentityInput({
      resNm,
      resNo,
      mobileNo,
    });
    if (validationError) {
      setActionError(validationError);
      return;
    }

    await runRequest<NhisActionResponse>({
      kind: "init",
      url: "/api/health/nhis/init",
      fallbackError: HEALTH_LINK_COPY.hook.initFallback,
      body: {
        loginMethod: "EASY",
        loginOrgCd: NHIS_LOGIN_ORG,
        resNm: resNm.trim(),
        resNo,
        mobileNo,
      },
      onSuccess: async (payload) => {
        setFetchFailures([]);
        const restoredFromLocal =
          payload.linked && payload.reused
            ? restoreFetchedFromLocalCache(status?.lastFetchedAt ?? null)
            : false;
        if (!restoredFromLocal) {
          setFetched(null);
          setFetchedFromLocalCache(false);
        }
        setActionNotice(resolveInitSuccessNotice(payload));
        setStatusError(null);
        if (payload.linked) {
          patchStatus({
            linked: true,
            loginMethod: "EASY",
            loginOrgCd: NHIS_LOGIN_ORG,
            pendingAuthReady: false,
            lastLinkedAt: new Date().toISOString(),
            lastError: null,
          });
        } else {
          patchStatus({
            linked: false,
            loginMethod: "EASY",
            loginOrgCd: NHIS_LOGIN_ORG,
            pendingAuthReady: true,
            hasStepData: true,
            lastError: null,
          });
        }
        if (payload.linked) requestAutoFetchAfterSign();
        await loadStatus({ preserveError: true });
      },
      onFailure: async () => {
        await loadStatus({ preserveError: true });
      },
    });
  }, [
    loadStatus,
    mobileNo,
    patchStatus,
    requestAutoFetchAfterSign,
    resNm,
    resNo,
    restoreFetchedFromLocalCache,
    runRequest,
    status?.lastFetchedAt,
  ]);

  const handleSign = useCallback(async () => {
    await runRequest<NhisActionResponse>({
      kind: "sign",
      url: "/api/health/nhis/sign",
      fallbackError: HEALTH_LINK_COPY.hook.signFallback,
      onSuccess: async (payload) => {
        setFetchFailures([]);
        setActionNotice(resolveSignSuccessNotice(payload));
        setStatusError(null);
        patchStatus({
          linked: true,
          pendingAuthReady: false,
          loginMethod: "EASY",
          loginOrgCd: NHIS_LOGIN_ORG,
          lastLinkedAt: new Date().toISOString(),
          lastError: null,
        });
        requestAutoFetchAfterSign();
        await loadStatus({ preserveError: true });
      },
      onFailure: async () => {
        await loadStatus({ preserveError: true });
      },
    });
  }, [loadStatus, patchStatus, requestAutoFetchAfterSign, runRequest]);

  const handleFetch = useCallback(async () => {
    await runSummaryFetch();
  }, [runSummaryFetch]);

  const handleUnlink = useCallback(async () => {
    await runRequest<NhisActionResponse>({
      kind: "unlink",
      url: "/api/health/nhis/unlink",
      fallbackError: HEALTH_LINK_COPY.hook.unlinkFallback,
      onSuccess: async () => {
        setFetched(null);
        setFetchedFromLocalCache(false);
        clearLocalNhisFetchData();
        setFetchFailures([]);
        setActionNotice(HEALTH_LINK_COPY.hook.unlinkNotice);
        setStatusError(null);
        patchStatus({
          linked: false,
          loginMethod: null,
          loginOrgCd: null,
          pendingAuthReady: false,
          hasStepData: false,
          hasCookieData: false,
          lastError: null,
        });
        await loadStatus({ preserveError: true });
      },
      onFailure: async () => {
        await loadStatus({ preserveError: true });
      },
    });
  }, [loadStatus, patchStatus, runRequest]);

  const showHealthInPrereqGuide =
    actionErrorCode === NHIS_ERR_CODE_HEALTHIN_REQUIRED ||
    status?.lastError?.code === NHIS_ERR_CODE_HEALTHIN_REQUIRED;

  return {
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
    loadStatus,
    handleInit,
    handleSign,
    handleFetch,
    handleUnlink,
  };
}
