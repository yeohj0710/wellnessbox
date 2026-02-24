"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  NHIS_ERR_CODE_HEALTHIN_REQUIRED,
  NHIS_LOGIN_ORG,
} from "./constants";
import { HEALTH_LINK_COPY } from "./copy";
import {
  buildFetchNotice,
  getFetchMessages,
  SUMMARY_FETCH_TARGETS,
  type FetchMessages,
} from "./fetchClientPolicy";
import type {
  ActionKind,
  NhisActionResponse,
  NhisFetchFailure,
  NhisFetchResponse,
  NhisStatusResponse,
} from "./types";
import { parseErrorMessage, readJson } from "./utils";
import {
  applySummaryBudgetBlockedState,
  resolveInitSuccessNotice,
  resolveSignSuccessNotice,
  resolveSummaryFetchBlocked,
  resolveSummaryFetchBlockedMessage,
  validateInitIdentityInput,
} from "./useNhisHealthLink.helpers";
import { useNhisSummaryAutoFetch } from "./useNhisSummaryAutoFetch";
import { useNhisActionRequest } from "./useNhisActionRequest";
import {
  clearLocalNhisFetchData,
  restoreLocalNhisFetchData,
  saveLocalNhisFetchData,
} from "./local-fetch-cache";

type LoadStatusOptions = {
  preserveError?: boolean;
};

function buildFallbackStatus(): NonNullable<NhisStatusResponse["status"]> {
  return {
    linked: false,
    provider: "HYPHEN_NHIS",
    loginMethod: null,
    loginOrgCd: null,
    lastLinkedAt: null,
    lastFetchedAt: null,
    lastError: null,
    hasStepData: false,
    hasCookieData: false,
    pendingAuthReady: false,
  };
}

export function useNhisHealthLink() {
  const [status, setStatus] = useState<NhisStatusResponse["status"]>();
  const [statusError, setStatusError] = useState<string | null>(null);

  const [resNm, setResNm] = useState("");
  const [resNo, setResNo] = useState("");
  const [mobileNo, setMobileNo] = useState("");

  const [actionLoading, setActionLoading] = useState<ActionKind>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionErrorCode, setActionErrorCode] = useState<string | null>(null);

  const [fetched, setFetched] = useState<NhisFetchResponse["data"] | null>(
    null
  );
  const [fetchedFromLocalCache, setFetchedFromLocalCache] = useState(false);
  const [fetchFailures, setFetchFailures] = useState<NhisFetchFailure[]>([]);
  const fetchInFlightRef = useRef(false);
  const statusLoadSeqRef = useRef(0);

  const summaryFetchBlocked = resolveSummaryFetchBlocked(status);

  const canRequest = actionLoading === null;
  const canSign =
    canRequest && !!(status?.pendingAuthReady || status?.hasStepData);
  const canFetch = canRequest && !!status?.linked && !summaryFetchBlocked;
  const summaryFetchBlockedMessage = summaryFetchBlocked
    ? resolveSummaryFetchBlockedMessage(status)
    : null;

  const patchStatus = useCallback(
    (patch: Partial<NonNullable<NhisStatusResponse["status"]>>) => {
      setStatus((prev) => ({
        ...(prev ?? buildFallbackStatus()),
        ...patch,
      }));
    },
    []
  );

  const loadStatus = useCallback(async (options?: LoadStatusOptions) => {
    const preserveError = options?.preserveError === true;
    const requestSeq = ++statusLoadSeqRef.current;
    if (!preserveError) {
      setStatusError(null);
    }
    try {
      const res = await fetch("/api/health/nhis/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = await readJson<NhisStatusResponse>(res);
      if (requestSeq !== statusLoadSeqRef.current) return;
      if (!res.ok || !data.ok) {
        if (!preserveError) {
          setStatusError(
            parseErrorMessage(
              data.error,
              HEALTH_LINK_COPY.hook.statusLoadFallback
            )
          );
        }
        return;
      }
      setStatus(data.status);
      setStatusError(null);
    } catch (error) {
      if (requestSeq !== statusLoadSeqRef.current) return;
      if (!preserveError) {
        setStatusError(error instanceof Error ? error.message : String(error));
      }
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const { runRequest } = useNhisActionRequest({
    canRequest,
    loadStatus,
    setActionLoading,
    setActionNotice,
    setActionError,
    setActionErrorCode,
  });

  const applyFetchFailure = useCallback(
    async (payload: NhisFetchResponse) => {
      setFetchFailures(payload.failed ?? []);
      await loadStatus({ preserveError: true });
    },
    [loadStatus]
  );

  const applyFetchSuccess = useCallback(
    async (payload: NhisFetchResponse, messages: FetchMessages) => {
      setFetched(payload.data ?? null);
      setFetchedFromLocalCache(false);
      setFetchFailures(payload.failed ?? []);
      setActionNotice(buildFetchNotice(payload, messages));
      setStatusError(null);
      saveLocalNhisFetchData({
        data: payload.data ?? null,
        fetchedAt: payload.cache?.fetchedAt ?? null,
      });
      await loadStatus({ preserveError: true });
    },
    [loadStatus]
  );

  const restoreFetchedFromLocalCache = useCallback(
    (expectedFetchedAt?: string | null) => {
      const restored = restoreLocalNhisFetchData({ expectedFetchedAt });
      if (!restored) return false;
      setFetched(restored);
      setFetchedFromLocalCache(true);
      setFetchFailures([]);
      return true;
    },
    []
  );

  useEffect(() => {
    if (!status?.linked) return;
    if (fetched !== null) return;
    if (!status.lastFetchedAt) return;
    restoreFetchedFromLocalCache(status.lastFetchedAt);
  }, [
    fetched,
    restoreFetchedFromLocalCache,
    status?.lastFetchedAt,
    status?.linked,
  ]);

  const runSummaryFetch = useCallback(async () => {
    if (fetchInFlightRef.current) return;
    if (summaryFetchBlocked) {
      applySummaryBudgetBlockedState(
        {
          setActionNotice,
          setActionErrorCode,
          setActionError,
        },
        status
      );
      return;
    }

    const messages = getFetchMessages("summary", false);
    fetchInFlightRef.current = true;
    try {
      await runRequest<NhisFetchResponse>({
        kind: "fetch",
        url: "/api/health/nhis/fetch",
        body: {
          targets: SUMMARY_FETCH_TARGETS,
        },
        fallbackError: messages.fallbackError,
        onFailure: async (payload) => {
          await applyFetchFailure(payload);
        },
        onSuccess: async (payload) => {
          await applyFetchSuccess(payload, messages);
        },
      });
    } finally {
      fetchInFlightRef.current = false;
    }
  }, [
    applyFetchFailure,
    applyFetchSuccess,
    runRequest,
    status,
    summaryFetchBlocked,
  ]);

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
