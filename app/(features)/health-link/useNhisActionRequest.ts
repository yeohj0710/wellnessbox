"use client";

import { useCallback } from "react";
import {
  NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED,
} from "./constants";
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
import { hasNhisSessionExpiredFailure, readJson } from "./utils";

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
  loadStatus: () => Promise<void>;
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
  const runRequest = useCallback(
    async <T extends NhisActionResponse | NhisFetchResponse>(
      options: RunRequestOptions<T>
    ) => {
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
          const message = resolveActionErrorMessage(
            {
              ...responseLike,
              errCd: errCode,
            },
            options.fallbackError
          );
          setActionErrorCode(errCode);
          setActionError(message);
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
