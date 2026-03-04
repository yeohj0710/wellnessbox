import {
  type NhisFetchRoutePayload,
  type NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import { resolveSummaryPatchPayload } from "./employee-sync-summary.fetch-patch";
import {
  asArray,
  asRecord,
  mergeSummaryNormalizedPayload,
  payloadHasMedicationNames,
  resolveSummaryPatchNeeds,
} from "./employee-sync-summary.normalizer";

export {
  buildBasePayload,
  buildDetailPayload,
  parseCachedPayload,
} from "./employee-sync-summary.fetch-patch";

export type SummaryPatchResult = {
  payload: NhisFetchRoutePayload;
  usedNetwork: boolean;
  patchedTargets: NhisFetchTarget[];
};

const RAW_TARGET_KEY_MAP: Record<NhisFetchTarget, string> = {
  medical: "medical",
  medication: "medication",
  checkupList: "checkupList",
  checkupYearly: "checkupYearly",
  checkupOverview: "checkupOverview",
  healthAge: "healthAge",
};

function mergeRawPayloadByTargets(input: {
  baseRaw: unknown;
  patchRaw: unknown;
  targets: NhisFetchTarget[];
}) {
  const base = asRecord(input.baseRaw);
  const patch = asRecord(input.patchRaw);
  if (!base && !patch) return null;

  const merged: Record<string, unknown> = { ...(base ?? {}) };
  for (const target of input.targets) {
    const rawKey = RAW_TARGET_KEY_MAP[target];
    if (!rawKey) continue;
    if (patch && Object.prototype.hasOwnProperty.call(patch, rawKey)) {
      merged[rawKey] = patch[rawKey];
    }
  }

  return merged;
}

export async function patchSummaryTargetsIfNeeded(input: {
  appUserId: string;
  identityHash: string;
  identity?: {
    name: string;
    birthDate: string;
    phoneNormalized: string;
  } | null;
  payload: NhisFetchRoutePayload;
  effectiveYearLimit: number;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
}): Promise<SummaryPatchResult> {
  const baseNormalized = input.payload.data?.normalized ?? null;
  const summaryPatchNeeds = resolveSummaryPatchNeeds(baseNormalized);
  const missingTargets = summaryPatchNeeds.targets;
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
    identity: input.identity,
    allowNetwork: true,
    requireMedicationNames: summaryPatchNeeds.medicationNeedsNameBackfill,
    hasRequiredMedicationNames: payloadHasMedicationNames,
  });
  if (!patch) {
    return { payload: input.payload, usedNetwork: false, patchedTargets: [] };
  }

  const patchedNormalized = mergeSummaryNormalizedPayload({
    baseNormalized,
    patchNormalized: patch.payload.data?.normalized ?? null,
    targets: missingTargets,
    medicationNameBackfill: summaryPatchNeeds.medicationNeedsNameBackfill,
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
      raw: mergeRawPayloadByTargets({
        baseRaw: input.payload.data?.raw,
        patchRaw: patch.payload.data?.raw,
        targets: missingTargets,
      }),
    },
  };

  return {
    payload: mergedPayload,
    usedNetwork: patch.usedNetwork,
    patchedTargets: missingTargets,
  };
}
