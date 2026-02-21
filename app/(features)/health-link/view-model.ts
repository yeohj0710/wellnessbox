import { HEALTH_LINK_COPY } from "./copy";
import type { FetchCacheInfo } from "./fetchClientPolicy";
import type { PrimaryFlow } from "./ui-types";

export function resolveStatusChip(hasLinked: boolean, hasAuthRequested: boolean) {
  if (hasLinked) {
    return {
      label: HEALTH_LINK_COPY.status.linked,
      tone: "on" as const,
    };
  }
  if (hasAuthRequested) {
    return {
      label: HEALTH_LINK_COPY.status.authRequested,
      tone: "pending" as const,
    };
  }
  return {
    label: HEALTH_LINK_COPY.status.notLinked,
    tone: "off" as const,
  };
}

export function resolvePrimaryFlow(statusLinked: boolean, hasAuthRequested: boolean): PrimaryFlow {
  if (statusLinked) {
    return {
      kind: "fetch",
      step: 3,
      title: HEALTH_LINK_COPY.flow.fetch.title,
      guide: HEALTH_LINK_COPY.flow.fetch.guide,
    };
  }

  if (hasAuthRequested) {
    return {
      kind: "sign",
      step: 2,
      title: HEALTH_LINK_COPY.flow.sign.title,
      guide: HEALTH_LINK_COPY.flow.sign.guide,
    };
  }

  return {
    kind: "init",
    step: 1,
    title: HEALTH_LINK_COPY.flow.init.title,
    guide: HEALTH_LINK_COPY.flow.init.guide,
  };
}

export function resolvePrimaryButtonLabel(isFetchStep: boolean, hasFetchResult: boolean) {
  if (isFetchStep && hasFetchResult) return HEALTH_LINK_COPY.action.reload;
  return HEALTH_LINK_COPY.action.next;
}

export function resolveFetchCacheHint(
  fetchCacheInfo: FetchCacheInfo | null,
  formatDateTime: (value?: string | null) => string
) {
  if (!fetchCacheInfo) return null;
  if (!fetchCacheInfo.cached) return HEALTH_LINK_COPY.fetch.liveResponse;

  return [
    HEALTH_LINK_COPY.fetch.cacheHitPrefix,
    ` ${formatDateTime(fetchCacheInfo.fetchedAt)}`,
    HEALTH_LINK_COPY.fetch.cacheHitInfix,
    ` ${formatDateTime(fetchCacheInfo.expiresAt)}`,
    HEALTH_LINK_COPY.fetch.cacheHitSuffix,
  ].join("");
}

export function resolveForceRefreshHint(
  forceRefreshBlocked: boolean,
  forceRefreshRemainingSeconds: number,
  forceRefreshAvailableAt: string | null,
  forceRefreshBudget: {
    remaining: number | null;
    limit: number | null;
    windowHours: number | null;
  },
  formatDateTime: (value?: string | null) => string
) {
  if (
    typeof forceRefreshBudget.remaining === "number" &&
    forceRefreshBudget.remaining <= 0 &&
    typeof forceRefreshBudget.limit === "number"
  ) {
    const windowText =
      typeof forceRefreshBudget.windowHours === "number"
        ? ` ${HEALTH_LINK_COPY.fetch.forceRefreshBudgetBlockedWindowPrefix} ${forceRefreshBudget.windowHours}${HEALTH_LINK_COPY.fetch.forceRefreshBudgetBlockedWindowSuffix}`
        : "";
    return [
      HEALTH_LINK_COPY.fetch.forceRefreshBudgetBlockedPrefix,
      `${forceRefreshBudget.remaining}`,
      HEALTH_LINK_COPY.fetch.forceRefreshBudgetBlockedMiddle,
      `${forceRefreshBudget.limit}`,
      HEALTH_LINK_COPY.fetch.forceRefreshBudgetBlockedSuffix,
      windowText,
    ].join("");
  }

  if (!forceRefreshBlocked) return HEALTH_LINK_COPY.fetch.forceRefreshDefault;

  return [
    HEALTH_LINK_COPY.fetch.forceRefreshBlockedPrefix,
    ` ${forceRefreshRemainingSeconds}`,
    HEALTH_LINK_COPY.fetch.forceRefreshBlockedMiddle,
    ` ${formatDateTime(forceRefreshAvailableAt)}`,
    HEALTH_LINK_COPY.fetch.forceRefreshBlockedSuffix,
  ].join("");
}

export function buildForceRefreshConfirmMessage(kind: "summary" | "detail") {
  const subject =
    kind === "detail"
      ? HEALTH_LINK_COPY.fetch.confirmDetailSubject
      : HEALTH_LINK_COPY.fetch.confirmSummarySubject;
  return `${HEALTH_LINK_COPY.fetch.confirmLine1Prefix} ${subject} ${HEALTH_LINK_COPY.fetch.confirmLine1Suffix}\n${HEALTH_LINK_COPY.fetch.confirmLine2}`;
}
