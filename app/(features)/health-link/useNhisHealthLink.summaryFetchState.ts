"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  applySummaryBudgetBlockedState,
  resolveSummaryFetchBlocked,
  resolveSummaryFetchBlockedMessage,
} from "./useNhisHealthLink.helpers";
import {
  restoreLocalNhisFetchData,
  saveLocalNhisFetchData,
} from "./local-fetch-cache";

type LoadStatus = (options?: { preserveError?: boolean }) => Promise<void>;

type RunRequest = <T extends NhisActionResponse | NhisFetchResponse>(options: {
  kind: Exclude<ActionKind, null>;
  url: string;
  body?: unknown;
  fallbackError: string;
  onSuccess?: (payload: T) => void | Promise<void>;
  onFailure?: (payload: T) => void | Promise<void>;
}) => Promise<void>;

type UseNhisSummaryFetchStateInput = {
  status: NhisStatusResponse["status"] | undefined;
  loadStatus: LoadStatus;
  runRequest: RunRequest;
  setActionNotice: (value: string | null) => void;
  setActionErrorCode: (value: string | null) => void;
  setActionError: (value: string | null) => void;
  setStatusError: (value: string | null) => void;
};

export function useNhisSummaryFetchState({
  status,
  loadStatus,
  runRequest,
  setActionNotice,
  setActionErrorCode,
  setActionError,
  setStatusError,
}: UseNhisSummaryFetchStateInput) {
  const [fetched, setFetched] = useState<NhisFetchResponse["data"] | null>(null);
  const [fetchedFromLocalCache, setFetchedFromLocalCache] = useState(false);
  const [fetchFailures, setFetchFailures] = useState<NhisFetchFailure[]>([]);
  const fetchInFlightRef = useRef(false);

  const summaryFetchBlocked = resolveSummaryFetchBlocked(status);
  const summaryFetchBlockedMessage = summaryFetchBlocked
    ? resolveSummaryFetchBlockedMessage(status)
    : null;

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
    [loadStatus, setActionNotice, setStatusError]
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
    setActionError,
    setActionErrorCode,
    setActionNotice,
    status,
    summaryFetchBlocked,
  ]);

  return {
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
  };
}
