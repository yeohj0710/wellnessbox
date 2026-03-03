"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED,
} from "./constants";
import { HEALTH_LINK_COPY } from "./copy";
import type {
  ActionKind,
  NhisActionResponse,
  NhisFetchFailure,
  NhisFetchResponse,
} from "./types";
import {
  ACTION_TIMEOUT_MS,
  resolveActionErrorMessage,
  resolveActionTimeoutMessage,
} from "./request-utils";
import {
  hasNhisSessionExpiredFailure,
  isNhisSessionExpiredError,
  readJson,
} from "./utils";

type RunRequestOptions<T extends NhisActionResponse | NhisFetchResponse> = {
  kind: Exclude<ActionKind, null>;
  url: string;
  body?: unknown;
  fallbackError: string;
  onSuccess?: (payload: T) => void | Promise<void>;
  onFailure?: (payload: T) => void | Promise<void>;
};

type UseNhisActionRequestInput = {
  canRequest: boolean;
  loadStatus: (options?: { preserveError?: boolean }) => Promise<void>;
  setActionLoading: (value: ActionKind) => void;
  setActionNotice: (value: string | null) => void;
  setActionError: (value: string | null) => void;
  setActionErrorCode: (value: string | null) => void;
};

export function useNhisActionRequest({
  canRequest,
  loadStatus,
  setActionLoading,
  setActionNotice,
  setActionError,
  setActionErrorCode,
}: UseNhisActionRequestInput) {
  const mountedRef = useRef(true);
  const controllersRef = useRef<Set<AbortController>>(new Set());

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      for (const controller of controllersRef.current) {
        controller.abort();
      }
      controllersRef.current.clear();
    };
  }, []);

  const runRequest = useCallback(
    async <T extends NhisActionResponse | NhisFetchResponse>(
      options: RunRequestOptions<T>
    ) => {
      if (!canRequest) return;
      if (!mountedRef.current) return;
      setActionLoading(options.kind);
      setActionNotice(null);
      setActionError(null);
      setActionErrorCode(null);

      let timeoutId: number | null = null;
      let controller: AbortController | null = null;
      try {
        const requestController = new AbortController();
        controller = requestController;
        controllersRef.current.add(requestController);
        const timeoutMs = ACTION_TIMEOUT_MS[options.kind] ?? 45_000;
        timeoutId = window.setTimeout(() => requestController.abort(), timeoutMs);

        if (window.navigator && window.navigator.onLine === false) {
          setActionErrorCode("NETWORK_ERROR");
          setActionError(HEALTH_LINK_COPY.hook.networkErrorFallback);
          return;
        }

        const res = await fetch(options.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options.body ?? {}),
          signal: requestController.signal,
        });

        if (timeoutId !== null) window.clearTimeout(timeoutId);
        const data = await readJson<T>(res);
        if (!mountedRef.current) return;
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
          const hasSessionExpiredError = isNhisSessionExpiredError(
            responseLike.errCd,
            responseLike.errMsg || responseLike.error
          );
          const errCode =
            responseLike.errCd?.trim() ||
            (hasSessionExpiredFailure || hasSessionExpiredError
              ? NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED
              : null) ||
            firstFailedCode;
          const message = resolveActionErrorMessage(
            {
              ...responseLike,
              errCd: errCode,
            },
            options.fallbackError
          );
          setActionErrorCode(errCode);
          setActionError(message);
          if (options.onFailure && mountedRef.current) await options.onFailure(data);
          return;
        }
        if (options.onSuccess && mountedRef.current) await options.onSuccess(data);
      } catch (error) {
        if (!mountedRef.current) return;
        if (error instanceof DOMException && error.name === "AbortError") {
          setActionErrorCode("CLIENT_TIMEOUT");
          setActionError(resolveActionTimeoutMessage(options.kind));
          void loadStatus({ preserveError: true });
          return;
        }
        if (error instanceof TypeError) {
          setActionErrorCode("NETWORK_ERROR");
          setActionError(HEALTH_LINK_COPY.hook.networkErrorFallback);
          return;
        }
        setActionError(error instanceof Error ? error.message : String(error));
      } finally {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        if (controller) controllersRef.current.delete(controller);
        if (mountedRef.current) {
          setActionLoading(null);
        }
      }
    },
    [
      canRequest,
      loadStatus,
      setActionError,
      setActionErrorCode,
      setActionLoading,
      setActionNotice,
    ]
  );

  return { runRequest };
}
