"use client";

import { NHIS_FETCH_DAILY_LIMIT_ERR_CODE } from "@/lib/shared/hyphen-fetch";
import { HEALTH_LINK_COPY } from "./copy";
import { buildClientBudgetBlockedMessage } from "./request-utils";
import type { NhisActionResponse, NhisStatusResponse } from "./types";

type ActionStateSetters = {
  setActionNotice: (value: string | null) => void;
  setActionErrorCode: (value: string | null) => void;
  setActionError: (value: string | null) => void;
};

export function resolveSummaryFetchBlocked(
  status: NhisStatusResponse["status"] | undefined
) {
  const fetchBudget = status?.fetchBudget;
  const hasValidSummaryCache = status?.cache?.summaryAvailable === true;
  const freshBudgetBlocked =
    typeof fetchBudget?.fresh?.remaining === "number" &&
    fetchBudget.fresh.remaining <= 0;
  return freshBudgetBlocked && !hasValidSummaryCache;
}

export function resolveSummaryFetchBlockedMessage(
  status: NhisStatusResponse["status"] | undefined
) {
  const fetchBudget = status?.fetchBudget;
  return buildClientBudgetBlockedMessage({
    reason: "fresh",
    budget: fetchBudget,
  });
}

export function applySummaryBudgetBlockedState(
  setters: ActionStateSetters,
  status: NhisStatusResponse["status"] | undefined
) {
  setters.setActionNotice(null);
  setters.setActionErrorCode(NHIS_FETCH_DAILY_LIMIT_ERR_CODE);
  setters.setActionError(resolveSummaryFetchBlockedMessage(status));
}

export function validateInitIdentityInput(input: {
  resNm: string;
  resNo: string;
  mobileNo: string;
}) {
  if (!input.resNm.trim()) return HEALTH_LINK_COPY.hook.inputNameRequired;
  if (!/^\d{8}$/.test(input.resNo)) {
    return HEALTH_LINK_COPY.hook.inputBirthInvalid;
  }
  if (!/^\d{10,11}$/.test(input.mobileNo)) {
    return HEALTH_LINK_COPY.hook.inputPhoneInvalid;
  }
  return null;
}

export function resolveInitSuccessNotice(payload: NhisActionResponse) {
  if (payload.linked) {
    return payload.reused
      ? HEALTH_LINK_COPY.hook.initNoticeDbReused
      : HEALTH_LINK_COPY.hook.initNoticeCreated;
  }
  return payload.reused
    ? HEALTH_LINK_COPY.hook.initNoticeReused
    : HEALTH_LINK_COPY.hook.initNoticeCreated;
}

export function resolveSignSuccessNotice(payload: NhisActionResponse) {
  return payload.reused
    ? HEALTH_LINK_COPY.hook.signNoticeReused
    : HEALTH_LINK_COPY.hook.signNoticeCompleted;
}

