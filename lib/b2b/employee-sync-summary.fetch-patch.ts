import {
  type NhisFetchTarget,
  type NhisFetchRoutePayload,
} from "@/lib/server/hyphen/fetch-contract";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import {
  buildNhisFetchRequestHash,
  saveNhisFetchCache,
} from "@/lib/server/hyphen/fetch-cache";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import type { HyphenNhisRequestPayload } from "@/lib/server/hyphen/client";
import { payloadHasRequestedRawTargets } from "./employee-sync-summary.raw-support";
import {
  parseCachedPayload,
  resolveSummaryPatchCachedPayload,
  type SummaryPatchResolvedPayload,
} from "./employee-sync-summary.fetch-patch-cache";

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
}): Promise<SummaryPatchResolvedPayload | null> {
  if (input.targets.length === 0) return null;

  const hashMeta = buildNhisFetchRequestHash({
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    fromDate: input.requestDefaults.fromDate,
    toDate: input.requestDefaults.toDate,
    subjectType: input.requestDefaults.subjectType,
  });

  const cached = await resolveSummaryPatchCachedPayload({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    requestHash: hashMeta.requestHash,
    targets: input.targets,
    effectiveYearLimit: input.effectiveYearLimit,
    subjectType: input.requestDefaults.subjectType,
    requireMedicationNames: input.requireMedicationNames,
    hasRequiredMedicationNames: input.hasRequiredMedicationNames,
  });
  if (cached) {
    return cached;
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
