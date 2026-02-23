"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NHIS_FETCH_DAILY_LIMIT_ERR_CODE,
  NHIS_FORCE_REFRESH_COOLDOWN_ERR_CODE,
  NHIS_FORCE_REFRESH_DAILY_LIMIT_ERR_CODE,
  NHIS_TARGET_POLICY_BLOCKED_ERR_CODE,
} from "@/lib/shared/hyphen-fetch";
import {
  NHIS_ERR_CODE_HEALTHIN_REQUIRED,
  NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED,
  NHIS_LOGIN_ORG,
} from "./constants";
import { HEALTH_LINK_COPY } from "./copy";
import {
  buildFetchNotice,
  buildForceRefreshCooldownMessage,
  CHECKUP_DETAIL_TARGETS,
  DETAIL_YEAR_LIMIT,
  getFetchMessages,
  mapFetchCacheInfo,
  SUMMARY_FETCH_TARGETS,
  type FetchCacheInfo,
  type FetchMessages,
  type FetchMode,
} from "./fetchClientPolicy";
import type {
  ActionKind,
  NhisActionResponse,
  NhisFetchFailure,
  NhisFetchResponse,
  NhisStatusResponse,
} from "./types";
import { hasNhisSessionExpiredFailure, parseErrorMessage, readJson } from "./utils";

function resolveActionErrorMessage(
  payload: Pick<
    NhisActionResponse,
    "error" | "errCd" | "errMsg" | "retryAfterSec" | "blockedTargets" | "budget"
  > & { failed?: NhisFetchFailure[] },
  fallback: string
) {
  const errCode = payload.errCd?.trim() || null;
  if (
    errCode === NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED ||
    hasNhisSessionExpiredFailure(payload.failed ?? [])
  ) {
    return HEALTH_LINK_COPY.hook.sessionExpiredDetected;
  }
  if (errCode === NHIS_FORCE_REFRESH_COOLDOWN_ERR_CODE) {
    if (typeof payload.retryAfterSec === "number" && payload.retryAfterSec > 0) {
      return buildForceRefreshCooldownMessage(payload.retryAfterSec);
    }
    return HEALTH_LINK_COPY.hook.forceRefreshCooldownFallback;
  }

  if (errCode === NHIS_TARGET_POLICY_BLOCKED_ERR_CODE) {
    const blocked = payload.blockedTargets?.filter(Boolean) ?? [];
    if (blocked.length > 0) {
      return `${HEALTH_LINK_COPY.hook.targetPolicyBlockedPrefix} ${blocked.join(", ")}`;
    }
    return HEALTH_LINK_COPY.hook.targetPolicyBlockedDefault;
  }

  if (
    errCode === NHIS_FETCH_DAILY_LIMIT_ERR_CODE ||
    errCode === NHIS_FORCE_REFRESH_DAILY_LIMIT_ERR_CODE
  ) {
    const windowHours = payload.budget?.windowHours ?? 24;
    const used =
      errCode === NHIS_FORCE_REFRESH_DAILY_LIMIT_ERR_CODE
        ? payload.budget?.forceRefresh.used
        : payload.budget?.fresh.used;
    const limit =
      errCode === NHIS_FORCE_REFRESH_DAILY_LIMIT_ERR_CODE
        ? payload.budget?.forceRefresh.limit
        : payload.budget?.fresh.limit;
    const retryText =
      typeof payload.retryAfterSec === "number" && payload.retryAfterSec > 0
        ? `${HEALTH_LINK_COPY.hook.budgetRetrySuffixPrefix} ${payload.retryAfterSec}${HEALTH_LINK_COPY.hook.budgetRetrySuffixUnit}`
        : "";

    if (typeof used === "number" && typeof limit === "number") {
      return [
        HEALTH_LINK_COPY.hook.budgetExceededDetailedPrefix,
        ` ${windowHours} ${HEALTH_LINK_COPY.hook.budgetExceededDetailedMiddle}`,
        ` ${used}/${limit} ${HEALTH_LINK_COPY.hook.budgetExceededDetailedSuffix}`,
        retryText,
      ].join("");
    }
    return `${HEALTH_LINK_COPY.hook.budgetExceededFallback}${retryText}`;
  }

  return parseErrorMessage(payload.errMsg || payload.error, fallback);
}

function buildClientBudgetBlockedMessageSafe(options: {
  reason: "fresh" | "forceRefresh";
  budget:
    | {
        windowHours?: number;
        fresh?: { used?: number; limit?: number };
        forceRefresh?: { used?: number; limit?: number };
      }
    | undefined;
  retryAfterSec?: number;
}) {
  const windowHours = options.budget?.windowHours ?? 24;
  const used =
    options.reason === "forceRefresh"
      ? options.budget?.forceRefresh?.used
      : options.budget?.fresh?.used;
  const limit =
    options.reason === "forceRefresh"
      ? options.budget?.forceRefresh?.limit
      : options.budget?.fresh?.limit;
  const retrySuffix =
    typeof options.retryAfterSec === "number" && options.retryAfterSec > 0
      ? `${HEALTH_LINK_COPY.hook.budgetRetrySuffixPrefix} ${options.retryAfterSec}${HEALTH_LINK_COPY.hook.budgetRetrySuffixUnit}`
      : "";

  if (typeof used === "number" && typeof limit === "number") {
    return [
      HEALTH_LINK_COPY.hook.budgetExceededDetailedPrefix,
      ` ${windowHours} ${HEALTH_LINK_COPY.hook.budgetExceededDetailedMiddle}`,
      ` ${used}/${limit} ${HEALTH_LINK_COPY.hook.budgetExceededDetailedSuffix}`,
      retrySuffix ? ` ${retrySuffix}` : "",
    ].join("");
  }
  return retrySuffix
    ? `${HEALTH_LINK_COPY.hook.budgetExceededFallback} ${retrySuffix}`
    : HEALTH_LINK_COPY.hook.budgetExceededFallback;
}

export function useNhisHealthLink() {
  const autoFetchAfterSignRef = useRef(false);
  const autoFetchOnEntryRef = useRef(false);
  const [status, setStatus] = useState<NhisStatusResponse["status"]>();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [resNm, setResNm] = useState("");
  const [resNo, setResNo] = useState("");
  const [mobileNo, setMobileNo] = useState("");

  const [actionLoading, setActionLoading] = useState<ActionKind>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionErrorCode, setActionErrorCode] = useState<string | null>(null);

  const [fetched, setFetched] = useState<NhisFetchResponse["data"] | null>(null);
  const [fetchFailures, setFetchFailures] = useState<NhisFetchFailure[]>([]);
  const [fetchCacheInfo, setFetchCacheInfo] = useState<FetchCacheInfo | null>(null);
  const fetchInFlightRef = useRef(false);

  const fetchBudget = status?.fetchBudget;
  const hasValidSummaryCache = status?.cache?.summaryAvailable === true;
  const freshBudgetBlocked =
    typeof fetchBudget?.fresh?.remaining === "number" &&
    fetchBudget.fresh.remaining <= 0;
  const forceRefreshBudgetBlocked =
    typeof fetchBudget?.forceRefresh?.remaining === "number" &&
    fetchBudget.forceRefresh.remaining <= 0;
  const summaryFetchBlocked = freshBudgetBlocked && !hasValidSummaryCache;

  const canRequest = actionLoading === null;
  const canSign = canRequest && !!(status?.pendingAuthReady || status?.hasStepData);
  const canFetch = canRequest && !!status?.linked && !summaryFetchBlocked;
  const hasDetailedRows = useMemo(() => {
    const rows = fetched?.normalized?.checkup?.yearly;
    return Array.isArray(rows) && rows.length > 0;
  }, [fetched?.normalized?.checkup?.yearly]);
  const forceRefreshRemainingSeconds = status?.forceRefresh?.remainingSeconds ?? 0;
  const forceRefreshBlocked = forceRefreshRemainingSeconds > 0;
  const summaryFetchBlockedMessage = summaryFetchBlocked
    ? buildClientBudgetBlockedMessageSafe({
        reason: "fresh",
        budget: fetchBudget,
      })
    : null;

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch("/api/health/nhis/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = await readJson<NhisStatusResponse>(res);
      if (!res.ok || !data.ok) {
        setStatusError(parseErrorMessage(data.error, HEALTH_LINK_COPY.hook.statusLoadFallback));
        return;
      }
      setStatus(data.status);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : String(error));
    } finally {
      setStatusLoading(false);
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
      try {
        const res = await fetch(options.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options.body ?? {}),
        });
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
            (hasSessionExpiredFailure ? NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED : null) ||
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
        setActionError(error instanceof Error ? error.message : String(error));
      } finally {
        setActionLoading(null);
      }
    },
    [canRequest]
  );

  const applyFetchFailure = useCallback(
    async (payload: NhisFetchResponse) => {
      setFetchFailures(payload.failed ?? []);
      setFetchCacheInfo(mapFetchCacheInfo(payload));
      await loadStatus();
    },
    [loadStatus]
  );

  const applyFetchSuccess = useCallback(
    async (payload: NhisFetchResponse, messages: FetchMessages) => {
      setFetched(payload.data ?? null);
      setFetchFailures(payload.failed ?? []);
      setFetchCacheInfo(mapFetchCacheInfo(payload));
      setActionNotice(buildFetchNotice(payload, messages));
      await loadStatus();
    },
    [loadStatus]
  );

  const runFetch = useCallback(
    async (mode: FetchMode, forceRefresh = false) => {
      if (fetchInFlightRef.current) return;

      if (mode === "detail" && !forceRefresh && hasDetailedRows) {
        setActionError(null);
        setActionErrorCode(null);
        setActionNotice(HEALTH_LINK_COPY.hook.detailAlreadyLoadedNotice);
        return;
      }

      if (summaryFetchBlocked) {
        setActionNotice(null);
        setActionErrorCode(NHIS_FETCH_DAILY_LIMIT_ERR_CODE);
        setActionError(
          buildClientBudgetBlockedMessageSafe({
            reason: "fresh",
            budget: fetchBudget,
          })
        );
        return;
      }

      if (forceRefresh && forceRefreshBudgetBlocked) {
        setActionNotice(null);
        setActionErrorCode(NHIS_FORCE_REFRESH_DAILY_LIMIT_ERR_CODE);
        setActionError(
          buildClientBudgetBlockedMessageSafe({
            reason: "forceRefresh",
            budget: fetchBudget,
          })
        );
        return;
      }

      if (forceRefresh && forceRefreshBlocked) {
        setActionErrorCode(NHIS_FORCE_REFRESH_COOLDOWN_ERR_CODE);
        setActionError(buildForceRefreshCooldownMessage(forceRefreshRemainingSeconds));
        return;
      }

      const isDetail = mode === "detail";
      const messages = getFetchMessages(mode, forceRefresh);
      fetchInFlightRef.current = true;
      try {
        await runRequest<NhisFetchResponse>({
          kind: isDetail ? "fetchDetail" : "fetch",
          url: "/api/health/nhis/fetch",
          body: {
            targets: isDetail ? CHECKUP_DETAIL_TARGETS : SUMMARY_FETCH_TARGETS,
            ...(isDetail ? { yearLimit: DETAIL_YEAR_LIMIT } : {}),
            ...(forceRefresh ? { forceRefresh: true } : {}),
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
    },
    [
      applyFetchFailure,
      applyFetchSuccess,
      fetchBudget,
      forceRefreshBlocked,
      forceRefreshBudgetBlocked,
      forceRefreshRemainingSeconds,
      hasDetailedRows,
      runRequest,
      summaryFetchBlocked,
    ]
  );

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
        setFetchCacheInfo(null);
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
        buildClientBudgetBlockedMessageSafe({
          reason: "fresh",
          budget: status.fetchBudget,
        })
      );
      return;
    }

    autoFetchAfterSignRef.current = false;
    setActionNotice(HEALTH_LINK_COPY.hook.autoFetchAfterSignNotice);
    void runFetch("summary");
  }, [actionLoading, runFetch, status?.fetchBudget, status?.linked, summaryFetchBlocked]);

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
    void runFetch("summary");
  }, [actionLoading, fetched, runFetch, status?.linked, summaryFetchBlocked]);

  useEffect(() => {
    if (!status?.linked) return;
    if (!summaryFetchBlocked) return;
    if (fetched) return;
    if (actionLoading !== null) return;
    if (actionErrorCode === NHIS_FETCH_DAILY_LIMIT_ERR_CODE && actionError) return;

    setActionNotice(null);
    setActionErrorCode(NHIS_FETCH_DAILY_LIMIT_ERR_CODE);
    setActionError(
      buildClientBudgetBlockedMessageSafe({
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
    await runFetch("summary");
  }, [runFetch]);

  const handleFetchFresh = useCallback(async () => {
    await runFetch("summary", true);
  }, [runFetch]);

  const handleFetchDetailed = useCallback(async () => {
    await runFetch("detail");
  }, [runFetch]);

  const handleFetchDetailedFresh = useCallback(async () => {
    await runFetch("detail", true);
  }, [runFetch]);

  const handleUnlink = useCallback(async () => {
    await runRequest<NhisActionResponse>({
      kind: "unlink",
      url: "/api/health/nhis/unlink",
      fallbackError: HEALTH_LINK_COPY.hook.unlinkFallback,
      onSuccess: async () => {
        setFetched(null);
        setFetchFailures([]);
        setFetchCacheInfo(null);
        setActionNotice(HEALTH_LINK_COPY.hook.unlinkNotice);
        await loadStatus();
      },
      onFailure: async () => {
        await loadStatus();
      },
    });
  }, [loadStatus, runRequest]);

  const currentStep = useMemo(() => {
    if (fetched) return 3;
    if (status?.linked) return 2;
    if (status?.pendingAuthReady || status?.hasStepData) return 1;
    return 0;
  }, [fetched, status?.hasStepData, status?.linked, status?.pendingAuthReady]);

  const showHealthInPrereqGuide =
    actionErrorCode === NHIS_ERR_CODE_HEALTHIN_REQUIRED ||
    status?.lastError?.code === NHIS_ERR_CODE_HEALTHIN_REQUIRED;

  return {
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
    actionErrorCode,
    fetched,
    fetchFailures,
    fetchCacheInfo,
    canRequest,
    canSign,
    canFetch,
    summaryFetchBlocked,
    summaryFetchBlockedMessage,
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
  };
}
