"use client";

import { useCallback, useState } from "react";
import { emitAuthSyncEvent } from "@/lib/client/auth-sync";
import type {
  ActionKind,
} from "./types";
import {
  isNhisSignReady,
} from "./useNhisHealthLink.helpers";
import { useNhisSummaryAutoFetch } from "./useNhisSummaryAutoFetch";
import { useNhisActionRequest } from "./useNhisActionRequest";
import { useNhisSummaryFetchState } from "./useNhisHealthLink.summaryFetchState";
import { useNhisStatusState } from "./useNhisHealthLink.status";
import { useNhisHealthLinkActions } from "./useNhisHealthLink.actions";

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
  const canSign = canRequest && isNhisSignReady(status);

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

  const emitNhisLinkSync = useCallback((reason: string) => {
    emitAuthSyncEvent({ scope: "nhis-link", reason });
  }, []);

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
  const {
    handleInit,
    handleSign,
    handleFetch,
    handleUnlink,
    showHealthInPrereqGuide,
  } = useNhisHealthLinkActions({
    status,
    resNm,
    resNo,
    mobileNo,
    runRequest,
    loadStatus,
    patchStatus,
    requestAutoFetchAfterSign,
    restoreFetchedFromLocalCache,
    runSummaryFetch,
    setFetched,
    setFetchedFromLocalCache,
    setFetchFailures,
    setActionNotice,
    setActionError,
    actionErrorCode,
    setActionErrorCode,
    setStatusError,
    emitNhisLinkSync,
  });

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
