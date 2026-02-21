"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NHIS_ERR_CODE_HEALTHIN_REQUIRED, NHIS_LOGIN_ORG } from "./constants";
import type {
  ActionKind,
  NhisActionResponse,
  NhisFetchFailure,
  NhisFetchResponse,
  NhisStatusResponse,
} from "./types";
import { parseErrorMessage, readJson } from "./utils";

const CHECKUP_ONLY_TARGETS = ["checkupOverview"] as const;

export function useNhisHealthLink(loggedIn: boolean) {
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

  const canRequest = loggedIn && actionLoading === null;
  const canSign = canRequest && !!(status?.pendingAuthReady || status?.hasStepData);
  const canFetch = canRequest && !!status?.linked;

  const loadStatus = useCallback(async () => {
    if (!loggedIn) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch("/api/health/nhis/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = await readJson<NhisStatusResponse>(res);
      if (!res.ok || !data.ok) {
        setStatusError(parseErrorMessage(data.error, "연동 상태를 불러오지 못했습니다."));
        return;
      }
      setStatus(data.status);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : String(error));
    } finally {
      setStatusLoading(false);
    }
  }, [loggedIn]);

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
          const errCode = (data as NhisActionResponse).errCd?.trim() || null;
          const msg = parseErrorMessage(
            (data as NhisActionResponse).errMsg || (data as NhisActionResponse).error,
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

  const handleInit = useCallback(async () => {
    if (!resNm.trim()) {
      setActionError("이름을 입력해 주세요.");
      return;
    }
    if (!/^\d{8}$/.test(resNo)) {
      setActionError("생년월일은 YYYYMMDD 형식으로 입력해 주세요.");
      return;
    }
    if (!/^\d{10,11}$/.test(mobileNo)) {
      setActionError("휴대폰 번호는 숫자 10~11자리로 입력해 주세요.");
      return;
    }

    await runRequest<NhisActionResponse>({
      kind: "init",
      url: "/api/health/nhis/init",
      fallbackError: "인증 요청에 실패했습니다.",
      body: {
        loginMethod: "EASY",
        loginOrgCd: NHIS_LOGIN_ORG,
        resNm: resNm.trim(),
        resNo,
        mobileNo,
      },
      onSuccess: async () => {
        setActionNotice("카카오 인증 요청을 보냈습니다. 카카오 앱에서 인증 후 다음을 눌러 주세요.");
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
      fallbackError: "인증 완료 처리에 실패했습니다.",
      onSuccess: async () => {
        setActionNotice("연동 인증이 완료되었습니다.");
        await loadStatus();
      },
      onFailure: async () => {
        await loadStatus();
      },
    });
  }, [loadStatus, runRequest]);

  const handleFetch = useCallback(async () => {
    await runRequest<NhisFetchResponse>({
      kind: "fetch",
      url: "/api/health/nhis/fetch",
      body: {
        targets: CHECKUP_ONLY_TARGETS,
      },
      fallbackError: "검진 데이터 조회에 실패했습니다.",
      onFailure: async (payload) => {
        setFetchFailures(payload.failed ?? []);
        await loadStatus();
      },
      onSuccess: async (payload) => {
        setFetched(payload.data ?? null);
        setFetchFailures(payload.failed ?? []);
        setActionNotice(
          payload.partial
            ? "일부 항목 조회에 실패했습니다. 실패 항목을 확인해 주세요."
            : "건강검진 수치를 성공적으로 불러왔습니다."
        );
        await loadStatus();
      },
    });
  }, [loadStatus, runRequest]);

  const handleUnlink = useCallback(async () => {
    await runRequest<NhisActionResponse>({
      kind: "unlink",
      url: "/api/health/nhis/unlink",
      fallbackError: "연동 해제에 실패했습니다.",
      onSuccess: async () => {
        setFetched(null);
        setFetchFailures([]);
        setActionNotice("연동이 해제되었습니다.");
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
    fetched,
    fetchFailures,
    canRequest,
    canSign,
    canFetch,
    currentStep,
    showHealthInPrereqGuide,
    loadStatus,
    handleInit,
    handleSign,
    handleFetch,
    handleUnlink,
  };
}
