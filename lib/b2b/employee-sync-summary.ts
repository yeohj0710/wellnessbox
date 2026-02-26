import { Prisma } from "@prisma/client";
import {
  type NhisFetchRoutePayload,
  type NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import {
  buildNhisFetchRequestHash,
  getLatestNhisFetchCacheByIdentity,
  getValidNhisFetchCache,
  markNhisFetchCacheHit,
  saveNhisFetchCache,
} from "@/lib/server/hyphen/fetch-cache";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import type { HyphenNhisRequestPayload } from "@/lib/server/hyphen/client";

export function buildBasePayload(input: {
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
}): HyphenNhisRequestPayload {
  return {
    loginMethod: (input.linkLoginMethod as "EASY" | "CERT" | null) ?? "EASY",
    loginOrgCd: input.linkLoginOrgCd ?? undefined,
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function resolveMedicationRows(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const medication = normalized?.medication;
  if (Array.isArray(medication)) return medication;
  const medicationRecord = asRecord(medication);
  if (!medicationRecord) return null;
  if (Array.isArray(medicationRecord.list)) return medicationRecord.list;
  if (Array.isArray(medicationRecord.rows)) return medicationRecord.rows;
  if (Array.isArray(medicationRecord.items)) return medicationRecord.items;
  if (Array.isArray(medicationRecord.history)) return medicationRecord.history;
  if (
    "list" in medicationRecord ||
    "rows" in medicationRecord ||
    "items" in medicationRecord ||
    "history" in medicationRecord
  ) {
    return [];
  }
  return null;
}

function resolveCheckupRows(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const checkup = normalized?.checkup;
  if (Array.isArray(checkup)) return checkup;
  const checkupRecord = asRecord(checkup);
  if (!checkupRecord) return null;
  if (Array.isArray(checkupRecord.overview)) return checkupRecord.overview;
  if (Array.isArray(checkupRecord.list)) return checkupRecord.list;
  if ("overview" in checkupRecord || "list" in checkupRecord) return [];
  return null;
}

function resolveMissingSummaryTargets(normalizedJson: unknown) {
  const missing = new Set<NhisFetchTarget>();
  const medicationRows = resolveMedicationRows(normalizedJson);
  const checkupRows = resolveCheckupRows(normalizedJson);

  // Empty arrays are valid "no history" results and should not trigger
  // additional network fetches.
  if (medicationRows == null) {
    missing.add("medication");
  }
  if (checkupRows == null) {
    missing.add("checkupOverview");
  }
  return [...missing];
}

function mergeSummaryNormalizedPayload(input: {
  baseNormalized: unknown;
  patchNormalized: unknown;
  targets: NhisFetchTarget[];
}) {
  const base = asRecord(input.baseNormalized) ?? {};
  const patch = asRecord(input.patchNormalized) ?? {};
  const merged: Record<string, unknown> = { ...base };

  if (input.targets.includes("medication") && patch.medication !== undefined) {
    merged.medication = patch.medication;
  }

  if (input.targets.includes("checkupOverview")) {
    const baseCheckup = asRecord(base.checkup) ?? {};
    const patchCheckup = asRecord(patch.checkup) ?? {};
    const mergedCheckup: Record<string, unknown> = { ...baseCheckup };
    if (patchCheckup.overview !== undefined) {
      mergedCheckup.overview = patchCheckup.overview;
    } else if (patch.checkup !== undefined && Array.isArray(patch.checkup)) {
      mergedCheckup.overview = patch.checkup;
    }
    merged.checkup = mergedCheckup;
  }

  return merged;
}

export type SummaryPatchResult = {
  payload: NhisFetchRoutePayload;
  usedNetwork: boolean;
  patchedTargets: NhisFetchTarget[];
};

async function resolveSummaryPatchPayload(input: {
  appUserId: string;
  identityHash: string;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
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
    if (parsed?.ok) {
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
    if (parsed?.ok) {
      return { payload: parsed, usedNetwork: false };
    }
  }

  if (!input.linkCookieData) return null;

  const basePayload = buildBasePayload({
    linkLoginMethod: input.linkLoginMethod,
    linkLoginOrgCd: input.linkLoginOrgCd,
    linkCookieData: input.linkCookieData,
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
  return { payload: executed.payload, usedNetwork: true };
}

export async function patchSummaryTargetsIfNeeded(input: {
  appUserId: string;
  identityHash: string;
  payload: NhisFetchRoutePayload;
  effectiveYearLimit: number;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
}): Promise<SummaryPatchResult> {
  const baseNormalized = input.payload.data?.normalized ?? null;
  const missingTargets = resolveMissingSummaryTargets(baseNormalized);
  if (missingTargets.length === 0) {
    return { payload: input.payload, usedNetwork: false, patchedTargets: [] };
  }

  const patch = await resolveSummaryPatchPayload({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    targets: missingTargets,
    effectiveYearLimit: input.effectiveYearLimit,
    requestDefaults: input.requestDefaults,
    linkLoginMethod: input.linkLoginMethod,
    linkLoginOrgCd: input.linkLoginOrgCd,
    linkCookieData: input.linkCookieData,
  });
  if (!patch) {
    return { payload: input.payload, usedNetwork: false, patchedTargets: [] };
  }

  const patchedNormalized = mergeSummaryNormalizedPayload({
    baseNormalized,
    patchNormalized: patch.payload.data?.normalized ?? null,
    targets: missingTargets,
  });
  const mergedPayload: NhisFetchRoutePayload = {
    ...input.payload,
    partial: input.payload.partial === true || patch.payload.partial === true,
    failed: [
      ...asArray(input.payload.failed),
      ...asArray(patch.payload.failed),
    ] as NhisFetchRoutePayload["failed"],
    data: {
      ...asRecord(input.payload.data),
      normalized: patchedNormalized,
      raw: input.payload.data?.raw ?? patch.payload.data?.raw ?? null,
    },
  };

  return {
    payload: mergedPayload,
    usedNetwork: patch.usedNetwork,
    patchedTargets: missingTargets,
  };
}
