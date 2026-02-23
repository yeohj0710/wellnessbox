"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  NHIS_FETCH_DAILY_LIMIT_ERR_CODE,
} from "@/lib/shared/hyphen-fetch";
import {
  NHIS_ERR_CODE_HEALTHIN_REQUIRED,
  NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED,
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
import {
  ACTION_TIMEOUT_MS,
  buildClientBudgetBlockedMessage,
  resolveActionErrorMessage,
  resolveActionTimeoutMessage,
} from "./request-utils";
import {
  hasNhisSessionExpiredFailure,
  parseErrorMessage,
  readJson,
} from "./utils";

export function useNhisHealthLink() {
  const autoFetchAfterSignRef = useRef(false);
  const autoFetchOnEntryRef = useRef(false);
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

  const fetchBudget = status?.fetchBudget;
  const hasValidSummaryCache = status?.cache?.summaryAvailable === true;
  const freshBudgetBlocked =
    typeof fetchBudget?.fresh?.remaining === "number" &&
    fetchBudget.fresh.remaining <= 0;
  const summaryFetchBlocked = freshBudgetBlocked && !hasValidSummaryCache;

  const canRequest = actionLoading === null;
  const canSign =
    canRequest && !!(status?.pendingAuthReady || status?.hasStepData);
  const canFetch = canRequest && !!status?.linked && !summaryFetchBlocked;
  const summaryFetchBlockedMessage = summaryFetchBlocked
    ? buildClientBudgetBlockedMessage({
        reason: "fresh",
        budget: fetchBudget,
      })
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

  const runRequest = useCallback(
    async <T extends NhisActionResponse | NhisFetchResponse>(options: {
      kind: Exclude<ActionKind, null>;
      url: string;
      body?: unknown;
      fallbackError: string;
      onSuccess?: (payload: T) => void | Promise<void>;
      onFailure?: (payload: T) => void | Promise<void>;
    }) => {
      if (!canRequest) return;
      setActionLoading(options.kind);
      setActionNotice(null);
      setActionError(null);
      setActionErrorCode(null);
      let timeoutId: number | null = null;
      try {
        const controller = new AbortController();
        const timeoutMs = ACTION_TIMEOUT_MS[options.kind] ?? 45_000;
        timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(options.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options.body ?? {}),
          signal: controller.signal,
        });
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        const data = await readJson<T>(res);
        if (!res.ok || !data.ok) {
          const responseLike = data as NhisActionResponse & {
            failed?: NhisFetchFailure[];
          };
          const firstFailedCode =
            responseLike.failed
              ?.map((item) => item.errCd?.trim() || null)
              .find((code) => code !== null) ?? null;
          const hasSessionExpiredFailure = hasNhisSessionExpiredFailure(
            responseLike.failed ?? []
          );
          const errCode =
            responseLike.errCd?.trim() ||
            (hasSessionExpiredFailure
              ? NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED
              : null) ||
            firstFailedCode;
          const msg = resolveActionErrorMessage(
            {
              ...responseLike,
              errCd: errCode,
            },
            options.fallbackError
          );
          setActionErrorCode(errCode);
          setActionError(msg);
          if (options.onFailure) await options.onFailure(data);
          return;
        }
        if (options.onSuccess) await options.onSuccess(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setActionErrorCode("CLIENT_TIMEOUT");
          setActionError(resolveActionTimeoutMessage(options.kind));
          void loadStatus();
          return;
        }
        setActionError(error instanceof Error ? error.message : String(error));
      } finally {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        setActionLoading(null);
      }
    },
    [canRequest, loadStatus]
  );

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
      setActionNotice(null);
      setActionErrorCode(NHIS_FETCH_DAILY_LIMIT_ERR_CODE);
      setActionError(
        buildClientBudgetBlockedMessage({
          reason: "fresh",
          budget: fetchBudget,
        })
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
    fetchBudget,
    runRequest,
    summaryFetchBlocked,
  ]);

  const handleInit = useCallback(async () => {
    if (!resNm.trim()) {
      setActionError(HEALTH_LINK_COPY.hook.inputNameRequired);
      return;
    }
    if (!/^\d{8}$/.test(resNo)) {
      setActionError(HEALTH_LINK_COPY.hook.inputBirthInvalid);
      return;
    }
    if (!/^\d{10,11}$/.test(mobileNo)) {
      setActionError(HEALTH_LINK_COPY.hook.inputPhoneInvalid);
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
        if (payload.linked) {
          setActionNotice(
            payload.reused
              ? HEALTH_LINK_COPY.hook.initNoticeDbReused
              : HEALTH_LINK_COPY.hook.initNoticeCreated
          );
          autoFetchAfterSignRef.current = true;
        } else {
          setActionNotice(
            payload.reused
              ? HEALTH_LINK_COPY.hook.initNoticeReused
              : HEALTH_LINK_COPY.hook.initNoticeCreated
          );
        }
        await loadStatus();
      },
      onFailure: async () => {
        await loadStatus();
      },
    });
  }, [loadStatus, mobileNo, resNm, resNo, runRequest]);

  const handleSign = useCallback(async () => {
    await runRequest<NhisActionResponse>({
      kind: "sign",
      url: "/api/health/nhis/sign",
      fallbackError: HEALTH_LINK_COPY.hook.signFallback,
      onSuccess: async (payload) => {
        setFetchFailures([]);
        setActionNotice(
          payload.reused
            ? HEALTH_LINK_COPY.hook.signNoticeReused
            : HEALTH_LINK_COPY.hook.signNoticeCompleted
        );
        autoFetchAfterSignRef.current = true;
        await loadStatus();
      },
      onFailure: async () => {
        await loadStatus();
      },
    });
  }, [loadStatus, runRequest]);

  useEffect(() => {
    if (!autoFetchAfterSignRef.current) return;
    if (actionLoading !== null) return;
    if (!status?.linked) return;
    if (summaryFetchBlocked) {
      autoFetchAfterSignRef.current = false;
      setActionNotice(null);
      setActionErrorCode(NHIS_FETCH_DAILY_LIMIT_ERR_CODE);
      setActionError(
        buildClientBudgetBlockedMessage({
          reason: "fresh",
          budget: status.fetchBudget,
        })
      );
      return;
    }

    autoFetchAfterSignRef.current = false;
    setActionNotice(HEALTH_LINK_COPY.hook.autoFetchAfterSignNotice);
    void runSummaryFetch();
  }, [
    actionLoading,
    runSummaryFetch,
    status?.fetchBudget,
    status?.linked,
    summaryFetchBlocked,
  ]);

  useEffect(() => {
    if (autoFetchOnEntryRef.current) return;
    if (!status?.linked) return;
    if (actionLoading !== null) return;
    if (fetched) {
      autoFetchOnEntryRef.current = true;
      return;
    }
    if (summaryFetchBlocked) return;

    autoFetchOnEntryRef.current = true;
    setActionNotice(HEALTH_LINK_COPY.hook.autoFetchOnEntryNotice);
    void runSummaryFetch();
  }, [
    actionLoading,
    fetched,
    runSummaryFetch,
    status?.linked,
    summaryFetchBlocked,
  ]);

  useEffect(() => {
    if (!status?.linked) return;
    if (!summaryFetchBlocked) return;
    if (fetched) return;
    if (actionLoading !== null) return;
    if (actionErrorCode === NHIS_FETCH_DAILY_LIMIT_ERR_CODE && actionError)
      return;

    setActionNotice(null);
    setActionErrorCode(NHIS_FETCH_DAILY_LIMIT_ERR_CODE);
    setActionError(
      buildClientBudgetBlockedMessage({
        reason: "fresh",
        budget: status.fetchBudget,
      })
    );
  }, [
    actionError,
    actionErrorCode,
    actionLoading,
    fetched,
    status?.fetchBudget,
    status?.linked,
    summaryFetchBlocked,
  ]);

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
