import "server-only";

import {
  DEFAULT_DETAIL_YEAR_LIMIT,
  DEFAULT_NHIS_FETCH_TARGETS,
  DETAIL_YEAR_LIMIT_TARGETS,
  MAX_CHECKUP_LIST_YEARS_PER_REQUEST,
  type NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import {
  dedupeFetchTargets,
  normalizeFetchYearLimit,
  resolveEffectiveYearLimit,
} from "@/lib/shared/nhis-fetch-policy";

export function dedupeNhisFetchTargets(input?: NhisFetchTarget[]) {
  const deduped = dedupeFetchTargets(input, DEFAULT_NHIS_FETCH_TARGETS);
  const needsSummaryPair =
    deduped.includes("checkupOverview") || deduped.includes("medication");
  if (needsSummaryPair) {
    const restTargets = deduped.filter(
      (target) => target !== "checkupOverview" && target !== "medication"
    );
    const summaryTargets: NhisFetchTarget[] = [
      "checkupOverview",
      "medication",
    ];
    return [...summaryTargets, ...restTargets];
  }
  return deduped;
}

export function normalizeNhisFetchYearLimit(value?: number) {
  return normalizeFetchYearLimit(value, {
    defaultYearLimit: DEFAULT_DETAIL_YEAR_LIMIT,
    maxYearLimit: MAX_CHECKUP_LIST_YEARS_PER_REQUEST,
  });
}

export function resolveNhisEffectiveYearLimit(
  targets: NhisFetchTarget[],
  value?: number
) {
  return resolveEffectiveYearLimit(targets, value, {
    defaultYearLimit: DEFAULT_DETAIL_YEAR_LIMIT,
    maxYearLimit: MAX_CHECKUP_LIST_YEARS_PER_REQUEST,
    detailTargets: DETAIL_YEAR_LIMIT_TARGETS,
  });
}
