"use client";

import type { NhisFetchFailure } from "../types";
import { describeFetchFailure } from "../utils";

export function isSkippableFailure(
  failure: NhisFetchFailure,
  options: {
    hasAnyResult: boolean;
    hasCheckupRows: boolean;
    hasMedicationRows: boolean;
  }
) {
  const target = (failure.target || "").trim();
  const message = `${failure.errCd || ""} ${failure.errMsg || ""}`.toLowerCase();
  const isSessionExpired =
    (failure.errCd || "").trim().toUpperCase() === "LOGIN-999";

  if (isSessionExpired) return false;
  if (!options.hasAnyResult) return false;

  if (target === "medication" && options.hasCheckupRows) return true;
  if (target === "checkupOverview" && options.hasMedicationRows) return true;
  if (target === "healthAge" || target === "medical") return true;
  if (target === "checkupList" || target === "checkupYearly") return true;
  if (message.includes("invalid json")) return true;

  return false;
}

export function toFriendlyFailureMessage(failure: NhisFetchFailure) {
  const raw = describeFetchFailure(failure);
  if (/invalid json/i.test(raw)) {
    return "응답 형식이 불안정해서 이번에는 표시하지 않았어요.";
  }
  if (/timed?\s*out|timeout|지연/i.test(raw.toLowerCase())) {
    return "응답이 지연돼서 이번에는 표시하지 못했어요.";
  }
  return raw
    .replace(/실패/g, "지연")
    .replace(/failed/gi, "지연")
    .replace(/error/gi, "안내");
}
