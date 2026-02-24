"use client";

import { useCallback, useEffect, useRef } from "react";
import { NHIS_FETCH_DAILY_LIMIT_ERR_CODE } from "@/lib/shared/hyphen-fetch";
import { HEALTH_LINK_COPY } from "./copy";
import { applySummaryBudgetBlockedState } from "./useNhisHealthLink.helpers";
import type { ActionKind, NhisFetchResponse, NhisStatusResponse } from "./types";

type UseNhisSummaryAutoFetchInput = {
  actionLoading: ActionKind;
  status: NhisStatusResponse["status"] | undefined;
  fetched: NhisFetchResponse["data"] | null;
  fetchedFromLocalCache: boolean;
  summaryFetchBlocked: boolean;
  actionErrorCode: string | null;
  actionError: string | null;
  setActionNotice: (value: string | null) => void;
  setActionErrorCode: (value: string | null) => void;
  setActionError: (value: string | null) => void;
  runSummaryFetch: () => Promise<void>;
};

export function useNhisSummaryAutoFetch(input: UseNhisSummaryAutoFetchInput) {
  const autoFetchAfterSignRef = useRef(false);
  const autoFetchOnEntryRef = useRef(false);

  const requestAutoFetchAfterSign = useCallback(() => {
    autoFetchAfterSignRef.current = true;
  }, []);

  useEffect(() => {
    if (!autoFetchAfterSignRef.current) return;
    if (input.actionLoading !== null) return;
    if (!input.status?.linked) return;

    if (input.summaryFetchBlocked) {
      autoFetchAfterSignRef.current = false;
      applySummaryBudgetBlockedState(
        {
          setActionNotice: input.setActionNotice,
          setActionErrorCode: input.setActionErrorCode,
          setActionError: input.setActionError,
        },
        input.status
      );
      return;
    }

    autoFetchAfterSignRef.current = false;
    input.setActionNotice(HEALTH_LINK_COPY.hook.autoFetchAfterSignNotice);
    void input.runSummaryFetch();
  }, [
    input.actionLoading,
    input.runSummaryFetch,
    input.setActionError,
    input.setActionErrorCode,
    input.setActionNotice,
    input.status,
    input.summaryFetchBlocked,
  ]);

  useEffect(() => {
    if (autoFetchOnEntryRef.current) return;
    if (!input.status?.linked) return;
    if (input.actionLoading !== null) return;

    if (input.fetched && !input.fetchedFromLocalCache) {
      autoFetchOnEntryRef.current = true;
      return;
    }

    if (input.summaryFetchBlocked) return;

    autoFetchOnEntryRef.current = true;
    if (!input.fetchedFromLocalCache) {
      input.setActionNotice(HEALTH_LINK_COPY.hook.autoFetchOnEntryNotice);
    }
    void input.runSummaryFetch();
  }, [
    input.actionLoading,
    input.fetched,
    input.fetchedFromLocalCache,
    input.runSummaryFetch,
    input.setActionNotice,
    input.status?.linked,
    input.summaryFetchBlocked,
  ]);

  useEffect(() => {
    if (!input.status?.linked) return;
    if (!input.summaryFetchBlocked) return;
    if (input.fetched) return;
    if (input.actionLoading !== null) return;
    if (
      input.actionErrorCode === NHIS_FETCH_DAILY_LIMIT_ERR_CODE &&
      input.actionError
    ) {
      return;
    }

    applySummaryBudgetBlockedState(
      {
        setActionNotice: input.setActionNotice,
        setActionErrorCode: input.setActionErrorCode,
        setActionError: input.setActionError,
      },
      input.status
    );
  }, [
    input.actionError,
    input.actionErrorCode,
    input.actionLoading,
    input.fetched,
    input.setActionError,
    input.setActionErrorCode,
    input.setActionNotice,
    input.status,
    input.summaryFetchBlocked,
  ]);

  return {
    requestAutoFetchAfterSign,
  };
}
