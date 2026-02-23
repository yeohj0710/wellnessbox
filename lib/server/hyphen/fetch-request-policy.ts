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
  if (deduped.includes("medication") && !deduped.includes("checkupOverview")) {
    const withCheckupOverview: NhisFetchTarget[] = [
      "checkupOverview",
      ...deduped.filter((target) => target !== "checkupOverview"),
    ];
    return withCheckupOverview;
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
