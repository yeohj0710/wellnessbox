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
import {
  hasRawTargetPayload,
  mergeRawPayloadByTargets,
} from "./employee-sync-summary.raw-support";

export {
  buildBasePayload,
  buildDetailPayload,
} from "./employee-sync-summary.fetch-patch";
export { parseCachedPayload } from "./employee-sync-summary.fetch-patch-cache";

export type SummaryPatchResult = {
  payload: NhisFetchRoutePayload;
  usedNetwork: boolean;
  patchedTargets: NhisFetchTarget[];
};

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
  const missingTargetSet = new Set<NhisFetchTarget>(summaryPatchNeeds.targets);
  const baseRaw = asRecord(input.payload.data?.raw);

  // Legacy/partial cache payloads can have normalized placeholders while raw target payload is null.
  // In that case, force a target patch so medication/checkup data can be recovered.
  if (!hasRawTargetPayload(baseRaw, "medication")) {
    missingTargetSet.add("medication");
  }
  if (!hasRawTargetPayload(baseRaw, "checkupOverview")) {
    missingTargetSet.add("checkupOverview");
  }

  const missingTargets = [...missingTargetSet];
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
