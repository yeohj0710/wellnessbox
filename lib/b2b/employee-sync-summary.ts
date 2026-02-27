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
  const summaryPatchNeeds = resolveSummaryPatchNeeds(baseNormalized);
  const missingTargets = summaryPatchNeeds.targets;
  if (missingTargets.length === 0) {
    return { payload: input.payload, usedNetwork: false, patchedTargets: [] };
  }

  const skipNetworkFetchForMedicationBackfillOnly =
    summaryPatchNeeds.medicationNeedsNameBackfill &&
    missingTargets.length === 1 &&
    missingTargets[0] === "medication";

  const patch = await resolveSummaryPatchPayload({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    targets: missingTargets,
    effectiveYearLimit: input.effectiveYearLimit,
    requestDefaults: input.requestDefaults,
    linkLoginMethod: input.linkLoginMethod,
    linkLoginOrgCd: input.linkLoginOrgCd,
    linkCookieData: input.linkCookieData,
    allowNetwork: !skipNetworkFetchForMedicationBackfillOnly,
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
      raw: input.payload.data?.raw ?? patch.payload.data?.raw ?? null,
    },
  };

  return {
    payload: mergedPayload,
    usedNetwork: patch.usedNetwork,
    patchedTargets: missingTargets,
  };
}
