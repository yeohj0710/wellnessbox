import "server-only";

export const NHIS_FETCH_TARGETS = [
  "medical",
  "medication",
  "checkupList",
  "checkupYearly",
  "checkupOverview",
  "healthAge",
] as const;

export type NhisFetchTarget = (typeof NHIS_FETCH_TARGETS)[number];

export const LOW_COST_NHIS_FETCH_TARGETS: NhisFetchTarget[] = [
  "checkupOverview",
  "checkupList",
  "checkupYearly",
];

export const DETAIL_YEAR_LIMIT_TARGETS: NhisFetchTarget[] = [
  "checkupList",
  "checkupYearly",
];

export type NhisFetchFailedItem = {
  target: NhisFetchTarget;
  errCd?: string;
  errMsg?: string;
};

export type NhisFetchRoutePayload = {
  ok: boolean;
  partial?: boolean;
  failed?: NhisFetchFailedItem[];
  data?: {
    normalized?: unknown;
    raw?: unknown;
  };
  error?: string;
  [key: string]: unknown;
};

export const DEFAULT_NHIS_FETCH_TARGETS: NhisFetchTarget[] = ["checkupOverview"];

// Cost guard defaults: keep detailed fetch narrow unless explicitly expanded later.
export const DEFAULT_DETAIL_YEAR_LIMIT = 1;
export const MAX_CHECKUP_LIST_YEARS_PER_REQUEST = 2;
export const MAX_CHECKUP_YEARLY_REQUESTS_PER_FETCH = 1;
