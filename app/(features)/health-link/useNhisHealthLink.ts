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
  const [fetchFailures, setFetchFailures] = useState<NhisFetchFailure[]>([]);
  const fetchInFlightRef = useRef(false);

  const summaryFetchBlocked = resolveSummaryFetchBlocked(status);

  const canRequest = actionLoading === null;
  const canSign =
    canRequest && !!(status?.pendingAuthReady || status?.hasStepData);
  const canFetch = canRequest && !!status?.linked && !summaryFetchBlocked;
  const summaryFetchBlockedMessage = summaryFetchBlocked
    ? resolveSummaryFetchBlockedMessage(status)
    : null;

  const loadStatus = useCallback(async () => {
    setStatusError(null);
    try {
      const res = await fetch("/api/health/nhis/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = await readJson<NhisStatusResponse>(res);
      if (!res.ok || !data.ok) {
        setStatusError(
          parseErrorMessage(
            data.error,
            HEALTH_LINK_COPY.hook.statusLoadFallback
          )
        );
        return;
      }
      setStatus(data.status);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : String(error));
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
      await loadStatus();
    },
    [loadStatus]
  );

  const applyFetchSuccess = useCallback(
    async (payload: NhisFetchResponse, messages: FetchMessages) => {
      setFetched(payload.data ?? null);
      setFetchFailures(payload.failed ?? []);
      setActionNotice(buildFetchNotice(payload, messages));
      await loadStatus();
    },
    [loadStatus]
  );

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
        setFetched(null);
        setActionNotice(resolveInitSuccessNotice(payload));
        if (payload.linked) requestAutoFetchAfterSign();
        await loadStatus();
      },
      onFailure: async () => {
        await loadStatus();
      },
    });
  }, [loadStatus, mobileNo, requestAutoFetchAfterSign, resNm, resNo, runRequest]);

  const handleSign = useCallback(async () => {
    await runRequest<NhisActionResponse>({
      kind: "sign",
      url: "/api/health/nhis/sign",
      fallbackError: HEALTH_LINK_COPY.hook.signFallback,
      onSuccess: async (payload) => {
        setFetchFailures([]);
        setActionNotice(resolveSignSuccessNotice(payload));
        requestAutoFetchAfterSign();
        await loadStatus();
      },
      onFailure: async () => {
        await loadStatus();
      },
    });
  }, [loadStatus, requestAutoFetchAfterSign, runRequest]);

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
        setFetchFailures([]);
        setActionNotice(HEALTH_LINK_COPY.hook.unlinkNotice);
        await loadStatus();
      },
      onFailure: async () => {
        await loadStatus();
      },
    });
  }, [loadStatus, runRequest]);

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
