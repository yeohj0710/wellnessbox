"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeAuthSyncEvent } from "@/lib/client/auth-sync";
import { HEALTH_LINK_COPY } from "./copy";
import type { NhisStatusResponse } from "./types";
import { parseErrorMessage, readJson } from "./utils";
import { clearLocalNhisFetchData } from "./local-fetch-cache";

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

export function useNhisStatusState() {
  const [status, setStatus] = useState<NhisStatusResponse["status"]>();
  const [statusError, setStatusError] = useState<string | null>(null);
  const statusLoadSeqRef = useRef(0);

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

  useEffect(() => {
    const unsubscribe = subscribeAuthSyncEvent(
      (detail) => {
        if (detail.scope === "user-session") {
          clearLocalNhisFetchData();
          setStatus(undefined);
        }
        void loadStatus({ preserveError: true });
      },
      { scopes: ["user-session", "nhis-link"] }
    );
    return unsubscribe;
  }, [loadStatus]);

  return {
    status,
    statusError,
    setStatusError,
    patchStatus,
    loadStatus,
  };
}
