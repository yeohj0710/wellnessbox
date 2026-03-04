import { Prisma } from "@prisma/client";
import {
  type NhisFetchRoutePayload,
  type NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import {
  buildNhisFetchRequestHash,
  getLatestNhisFetchCacheByIdentity,
  getLatestNhisFetchCacheByIdentityGlobal,
  getValidNhisFetchCache,
  markNhisFetchCacheHit,
  saveNhisFetchCache,
} from "@/lib/server/hyphen/fetch-cache";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import type { HyphenNhisRequestPayload } from "@/lib/server/hyphen/client";

const RAW_TARGET_KEY_MAP: Record<NhisFetchTarget, string> = {
  medical: "medical",
  medication: "medication",
  checkupList: "checkupList",
  checkupYearly: "checkupYearly",
  checkupOverview: "checkupOverview",
  healthAge: "healthAge",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function payloadHasRequestedRawTargets(
  payload: NhisFetchRoutePayload,
  targets: NhisFetchTarget[]
) {
  const raw = asRecord(payload.data?.raw);
  if (!raw) return false;
  for (const target of targets) {
    const key = RAW_TARGET_KEY_MAP[target];
    if (!key) continue;
    if (raw[key] == null) return false;
  }
  return true;
}

export function buildBasePayload(input: {
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
  identity?: {
    name: string;
    birthDate: string;
    phoneNormalized: string;
  } | null;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
}): HyphenNhisRequestPayload {
  return {
    loginMethod: (input.linkLoginMethod as "EASY" | "CERT" | null) ?? "EASY",
    loginOrgCd: input.linkLoginOrgCd ?? undefined,
    resNm: input.identity?.name ?? undefined,
    resNo: input.identity?.birthDate ?? undefined,
    mobileNo: input.identity?.phoneNormalized ?? undefined,
    ...input.requestDefaults,
    cookieData: input.linkCookieData ?? undefined,
    showCookie: "Y" as const,
  };
}

export function buildDetailPayload(
  basePayload: HyphenNhisRequestPayload
): HyphenNhisRequestPayload {
  return { ...basePayload, detailYn: "Y" as const, imgYn: "N" as const };
}

export function parseCachedPayload(
  payload: Prisma.JsonValue
): NhisFetchRoutePayload | null {
  try {
    return JSON.parse(JSON.stringify(payload)) as NhisFetchRoutePayload;
  } catch {
    return null;
  }
}

export async function resolveSummaryPatchPayload(input: {
  appUserId: string;
  identityHash: string;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
  identity?: {
    name: string;
    birthDate: string;
    phoneNormalized: string;
  } | null;
  allowNetwork: boolean;
  requireMedicationNames: boolean;
  hasRequiredMedicationNames: (payload: NhisFetchRoutePayload) => boolean;
}) {
  if (input.targets.length === 0) return null;

  const hashMeta = buildNhisFetchRequestHash({
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    fromDate: input.requestDefaults.fromDate,
    toDate: input.requestDefaults.toDate,
    subjectType: input.requestDefaults.subjectType,
  });

  const validCache = await getValidNhisFetchCache(
    input.appUserId,
    hashMeta.requestHash
  );
  if (validCache) {
    await markNhisFetchCacheHit(validCache.id).catch(() => undefined);
    const parsed = parseCachedPayload(validCache.payload);
    if (
      parsed?.ok &&
      payloadHasRequestedRawTargets(parsed, input.targets) &&
      (!input.requireMedicationNames || input.hasRequiredMedicationNames(parsed))
    ) {
      return { payload: parsed, usedNetwork: false };
    }
  }

  const historyCache = await getLatestNhisFetchCacheByIdentity({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    subjectType: input.requestDefaults.subjectType,
  });
  if (historyCache) {
    const parsed = parseCachedPayload(historyCache.payload);
    if (
      parsed?.ok &&
      payloadHasRequestedRawTargets(parsed, input.targets) &&
      (!input.requireMedicationNames || input.hasRequiredMedicationNames(parsed))
    ) {
      return { payload: parsed, usedNetwork: false };
    }
  }

  const globalHistoryCache = await getLatestNhisFetchCacheByIdentityGlobal({
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    subjectType: input.requestDefaults.subjectType,
    excludeAppUserId: input.appUserId,
  });
  if (globalHistoryCache) {
    const parsed = parseCachedPayload(globalHistoryCache.payload);
    if (
      parsed?.ok &&
      payloadHasRequestedRawTargets(parsed, input.targets) &&
      (!input.requireMedicationNames || input.hasRequiredMedicationNames(parsed))
    ) {
      return { payload: parsed, usedNetwork: false };
    }
  }

  if (!input.allowNetwork) return null;
  if (!input.linkCookieData) return null;

  const basePayload = buildBasePayload({
    linkLoginMethod: input.linkLoginMethod,
    linkLoginOrgCd: input.linkLoginOrgCd,
    linkCookieData: input.linkCookieData,
    identity: input.identity,
    requestDefaults: input.requestDefaults,
  });
  const detailPayload = buildDetailPayload(basePayload);
  const executed = await executeNhisFetch({
    targets: input.targets,
    effectiveYearLimit: input.effectiveYearLimit,
    basePayload,
    detailPayload,
    requestDefaults: input.requestDefaults,
  });

  await saveNhisFetchCache({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    requestHash: hashMeta.requestHash,
    requestKey: hashMeta.requestKey,
    targets: hashMeta.normalizedTargets,
    yearLimit: input.effectiveYearLimit,
    fromDate: input.requestDefaults.fromDate,
    toDate: input.requestDefaults.toDate,
    subjectType: input.requestDefaults.subjectType,
    statusCode: executed.payload.ok ? 200 : 502,
    payload: executed.payload,
  });

  if (!executed.payload.ok) return null;
  if (!payloadHasRequestedRawTargets(executed.payload, input.targets)) {
    return null;
  }
  if (
    input.requireMedicationNames &&
    !input.hasRequiredMedicationNames(executed.payload)
  ) {
    return null;
  }
  return { payload: executed.payload, usedNetwork: true };
}
