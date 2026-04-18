import { Prisma } from "@prisma/client";
import type {
  NhisFetchRoutePayload,
  NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import {
  getLatestNhisFetchCacheByIdentity,
  getValidNhisFetchCache,
  markNhisFetchCacheHit,
} from "@/lib/server/hyphen/fetch-cache";
import { payloadHasRequestedRawTargets } from "./employee-sync-summary.raw-support";

type ResolveSummaryPatchCachedPayloadInput = {
  appUserId: string;
  identityHash: string;
  requestHash: string;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  subjectType: string | undefined;
  requireMedicationNames: boolean;
  hasRequiredMedicationNames: (payload: NhisFetchRoutePayload) => boolean;
};

export type SummaryPatchResolvedPayload = {
  payload: NhisFetchRoutePayload;
  usedNetwork: boolean;
};

export function parseCachedPayload(
  payload: Prisma.JsonValue
): NhisFetchRoutePayload | null {
  try {
    return JSON.parse(JSON.stringify(payload)) as NhisFetchRoutePayload;
  } catch {
    return null;
  }
}

function isUsableSummaryPatchCachedPayload(input: {
  payload: NhisFetchRoutePayload | null;
  targets: NhisFetchTarget[];
  requireMedicationNames: boolean;
  hasRequiredMedicationNames: (payload: NhisFetchRoutePayload) => boolean;
}) {
  const { payload } = input;
  if (!payload?.ok) return false;
  if (!payloadHasRequestedRawTargets(payload, input.targets)) return false;
  if (
    input.requireMedicationNames &&
    !input.hasRequiredMedicationNames(payload)
  ) {
    return false;
  }
  return true;
}

export async function resolveSummaryPatchCachedPayload(
  input: ResolveSummaryPatchCachedPayloadInput
): Promise<SummaryPatchResolvedPayload | null> {
  const validCache = await getValidNhisFetchCache(
    input.appUserId,
    input.requestHash
  );
  if (validCache) {
    await markNhisFetchCacheHit(validCache.id).catch(() => undefined);
    const parsed = parseCachedPayload(validCache.payload);
    if (
      parsed &&
      isUsableSummaryPatchCachedPayload({
        payload: parsed,
        targets: input.targets,
        requireMedicationNames: input.requireMedicationNames,
        hasRequiredMedicationNames: input.hasRequiredMedicationNames,
      })
    ) {
      return { payload: parsed, usedNetwork: false as const };
    }
  }

  const historyCache = await getLatestNhisFetchCacheByIdentity({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    subjectType: input.subjectType,
  });
  if (historyCache) {
    const parsed = parseCachedPayload(historyCache.payload);
    if (
      parsed &&
      isUsableSummaryPatchCachedPayload({
        payload: parsed,
        targets: input.targets,
        requireMedicationNames: input.requireMedicationNames,
        hasRequiredMedicationNames: input.hasRequiredMedicationNames,
      })
    ) {
      return { payload: parsed, usedNetwork: false as const };
    }
  }

  return null;
}
