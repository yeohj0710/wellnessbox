"use client";

import {
  NHIS_FETCH_DAILY_LIMIT_ERR_CODE,
  NHIS_FORCE_REFRESH_COOLDOWN_ERR_CODE,
  NHIS_FORCE_REFRESH_DAILY_LIMIT_ERR_CODE,
  NHIS_TARGET_POLICY_BLOCKED_ERR_CODE,
} from "@/lib/shared/hyphen-fetch";
import { NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED } from "./constants";
import { HEALTH_LINK_COPY } from "./copy";
import { buildForceRefreshCooldownMessage } from "./fetchClientPolicy";
import type { ActionKind, NhisActionResponse, NhisFetchFailure } from "./types";
import {
  hasNhisSessionExpiredFailure,
  isNhisSessionExpiredError,
  parseErrorMessage,
} from "./utils";

type BudgetLike = {
  windowHours?: number;
  fresh?: { used?: number; limit?: number };
  forceRefresh?: { used?: number; limit?: number };
};

type ActionErrorPayload = Pick<
  NhisActionResponse,
  "error" | "errCd" | "errMsg" | "retryAfterSec" | "blockedTargets" | "budget"
> & { failed?: NhisFetchFailure[] };

export const ACTION_TIMEOUT_MS: Record<Exclude<ActionKind, null>, number> = {
  init: 25_000,
  sign: 35_000,
  fetch: 45_000,
  fetchDetail: 45_000,
  unlink: 15_000,
  status: 15_000,
};

export function resolveActionTimeoutMessage(kind: Exclude<ActionKind, null>) {
  if (kind === "fetch") return HEALTH_LINK_COPY.hook.fetchTimeout;
  if (kind === "fetchDetail") return HEALTH_LINK_COPY.hook.fetchDetailTimeout;
  if (kind === "sign") return HEALTH_LINK_COPY.hook.signTimeout;
  if (kind === "init") return HEALTH_LINK_COPY.hook.initTimeout;
  return HEALTH_LINK_COPY.hook.requestTimeoutFallback;
}

export function resolveActionErrorMessage(
  payload: ActionErrorPayload,
  fallback: string
) {
  const errCode = payload.errCd?.trim() || null;
  if (
    errCode === NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED ||
    isNhisSessionExpiredError(payload.errCd, payload.errMsg || payload.error) ||
    hasNhisSessionExpiredFailure(payload.failed ?? [])
  ) {
    return HEALTH_LINK_COPY.hook.sessionExpiredDetected;
  }
  if (errCode === NHIS_FORCE_REFRESH_COOLDOWN_ERR_CODE) {
    if (
      typeof payload.retryAfterSec === "number" &&
      payload.retryAfterSec > 0
    ) {
      return buildForceRefreshCooldownMessage(payload.retryAfterSec);
    }
    return HEALTH_LINK_COPY.hook.forceRefreshCooldownFallback;
  }

  if (errCode === NHIS_TARGET_POLICY_BLOCKED_ERR_CODE) {
    const blocked = payload.blockedTargets?.filter(Boolean) ?? [];
    if (blocked.length > 0) {
      return `${HEALTH_LINK_COPY.hook.targetPolicyBlockedPrefix} ${blocked.join(
        ", "
      )}`;
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

export function buildClientBudgetBlockedMessage(options: {
  reason: "fresh" | "forceRefresh";
  budget: BudgetLike | undefined;
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
