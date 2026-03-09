"use client";

import { useCallback } from "react";
import {
  NHIS_ERR_CODE_HEALTHIN_REQUIRED,
  NHIS_LOGIN_ORG,
} from "./constants";
import { HEALTH_LINK_COPY } from "./copy";
import { clearLocalNhisFetchData } from "./local-fetch-cache";
import type {
  ActionKind,
  NhisActionResponse,
  NhisFetchFailure,
  NhisFetchResponse,
  NhisStatusResponse,
} from "./types";
import {
  resolveInitSuccessNotice,
  resolveSignSuccessNotice,
  validateInitIdentityInput,
} from "./useNhisHealthLink.helpers";

type RunRequest = <T extends NhisActionResponse | NhisFetchResponse>(options: {
  kind: Exclude<ActionKind, null>;
  url: string;
  body?: unknown;
  fallbackError: string;
  onSuccess?: (payload: T) => void | Promise<void>;
  onFailure?: (payload: T) => void | Promise<void>;
}) => Promise<void>;

type UseNhisHealthLinkActionsInput = {
  status: NhisStatusResponse["status"] | undefined;
  resNm: string;
  resNo: string;
  mobileNo: string;
  runRequest: RunRequest;
  loadStatus: (options?: { preserveError?: boolean }) => Promise<void>;
  patchStatus: (
    patch: Partial<NonNullable<NhisStatusResponse["status"]>>
  ) => void;
  requestAutoFetchAfterSign: () => void;
  restoreFetchedFromLocalCache: (expectedFetchedAt?: string | null) => boolean;
  runSummaryFetch: () => Promise<void>;
  setFetched: (value: NhisFetchResponse["data"] | null) => void;
  setFetchedFromLocalCache: (value: boolean) => void;
  setFetchFailures: (value: NhisFetchFailure[]) => void;
  setActionNotice: (value: string | null) => void;
  setActionError: (value: string | null) => void;
  actionErrorCode: string | null;
  setActionErrorCode: (value: string | null) => void;
  setStatusError: (value: string | null) => void;
  emitNhisLinkSync: (reason: string) => void;
};

export function useNhisHealthLinkActions({
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
}: UseNhisHealthLinkActionsInput) {
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
          emitNhisLinkSync("init-linked");
          patchStatus({
            linked: true,
            loginMethod: "EASY",
            loginOrgCd: NHIS_LOGIN_ORG,
            pendingAuthReady: false,
            lastLinkedAt: new Date().toISOString(),
            lastError: null,
          });
        } else {
          emitNhisLinkSync("init-pending");
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
    emitNhisLinkSync,
    loadStatus,
    mobileNo,
    patchStatus,
    requestAutoFetchAfterSign,
    resNm,
    resNo,
    restoreFetchedFromLocalCache,
    runRequest,
    setActionError,
    setActionNotice,
    setFetched,
    setFetchedFromLocalCache,
    setFetchFailures,
    setStatusError,
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
        emitNhisLinkSync("sign-linked");
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
  }, [
    emitNhisLinkSync,
    loadStatus,
    patchStatus,
    requestAutoFetchAfterSign,
    runRequest,
    setActionNotice,
    setFetchFailures,
    setStatusError,
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
        setFetchedFromLocalCache(false);
        clearLocalNhisFetchData();
        setFetchFailures([]);
        emitNhisLinkSync("unlink");
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
  }, [
    emitNhisLinkSync,
    loadStatus,
    patchStatus,
    runRequest,
    setActionNotice,
    setFetched,
    setFetchedFromLocalCache,
    setFetchFailures,
    setStatusError,
  ]);

  const showHealthInPrereqGuide =
    actionErrorCode === NHIS_ERR_CODE_HEALTHIN_REQUIRED ||
    status?.lastError?.code === NHIS_ERR_CODE_HEALTHIN_REQUIRED;

  return {
    handleInit,
    handleSign,
    handleFetch,
    handleUnlink,
    showHealthInPrereqGuide,
  };
}
