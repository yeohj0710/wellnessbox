import "server-only";

import type { HyphenApiResponse } from "@/lib/server/hyphen/client";
import {
  extractCookieData,
  extractStepData,
} from "@/lib/server/hyphen/client.runtime";
import {
  DEFAULT_DETAIL_YEAR_LIMIT,
  MAX_CHECKUP_LIST_YEARS_PER_REQUEST,
} from "@/lib/server/hyphen/fetch-contract";

export type DetailKeyPair = {
  detailKey: string;
  detailKey2?: string;
};

export type RequestDefaultsLike = {
  fromDate?: string;
  toDate?: string;
};

function toNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseYears(fromDate?: string, toDate?: string, maxYears = 15) {
  const fromYear = Number((fromDate || "").slice(0, 4));
  const toYear = Number((toDate || "").slice(0, 4));
  const currentYear = new Date().getFullYear();

  if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) {
    return [String(currentYear)];
  }

  const start = Math.max(1900, Math.min(fromYear, toYear));
  const end = Math.min(2100, Math.max(fromYear, toYear));
  const years: string[] = [];
  for (let year = end; year >= start; year -= 1) {
    years.push(String(year));
    if (years.length >= maxYears) break;
  }
  return years;
}

export function collectDetailKeyPairs(
  input: unknown,
  maxPairs = 20
): DetailKeyPair[] {
  const out: DetailKeyPair[] = [];
  const seen = new Set<string>();

  function visit(value: unknown, depth: number) {
    if (depth > 8 || out.length >= maxPairs) return;
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (out.length >= maxPairs) break;
        visit(item, depth + 1);
      }
      return;
    }

    const record = value as Record<string, unknown>;
    const detailKey =
      toNonEmptyText(record.detailKey) ??
      toNonEmptyText(record.detail_key) ??
      toNonEmptyText(record.detailkey);
    const detailKey2 =
      toNonEmptyText(record.detailKey2) ??
      toNonEmptyText(record.detail_key2) ??
      toNonEmptyText(record.detailkey2);

    if (detailKey) {
      const signature = `${detailKey}|${detailKey2 ?? ""}`;
      if (!seen.has(signature)) {
        seen.add(signature);
        out.push({ detailKey, detailKey2: detailKey2 ?? undefined });
      }
    }

    for (const child of Object.values(record)) {
      if (out.length >= maxPairs) break;
      visit(child, depth + 1);
    }
  }

  visit(input, 0);
  return out;
}

export function mergeListPayloads(payloads: HyphenApiResponse[]) {
  const mergedList: unknown[] = [];
  const years: string[] = [];
  let latestCookieData: unknown = undefined;
  let latestStepData: unknown = undefined;

  for (const payload of payloads) {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const list = Array.isArray(data.list) ? data.list : [];
    mergedList.push(...list);

    const yyyy = toNonEmptyText(data.yyyy ?? data.year ?? data.businessYear);
    if (yyyy) years.push(yyyy);

    const cookieData = extractCookieData(payload);
    if (cookieData != null) {
      latestCookieData = cookieData;
    }
    const stepData = extractStepData(payload);
    if (stepData != null) {
      latestStepData = stepData;
    }
  }

  return {
    data: {
      list: mergedList,
      years,
      ...(latestCookieData !== undefined ? { cookieData: latestCookieData } : {}),
      ...(latestStepData !== undefined ? { stepData: latestStepData } : {}),
    },
  } as HyphenApiResponse;
}

export function normalizeYearLimit(value: number) {
  return Math.max(
    DEFAULT_DETAIL_YEAR_LIMIT,
    Math.min(value, MAX_CHECKUP_LIST_YEARS_PER_REQUEST)
  );
}
