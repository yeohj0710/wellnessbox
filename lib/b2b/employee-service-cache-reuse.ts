import {
  getLatestNhisFetchCacheByIdentity,
  getValidNhisFetchCache,
  markNhisFetchCacheHit,
} from "@/lib/server/hyphen/fetch-cache";
import type { NhisFetchTarget } from "@/lib/server/hyphen/fetch-contract";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import { parseCachedPayload, patchSummaryTargetsIfNeeded } from "@/lib/b2b/employee-sync-summary";
import {
  persistSnapshotAndSyncState,
  type SnapshotSource,
} from "@/lib/b2b/employee-sync-snapshot";

type SummaryPatchContext = {
  appUserId: string;
  identityHash: string;
  identity: {
    name: string;
    birthDate: string;
    phoneNormalized: string;
  };
  effectiveYearLimit: number;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
};

type PersistedEmployeeSyncSnapshot = Awaited<
  ReturnType<typeof persistSnapshotAndSyncState>
>;

async function tryPersistReusedPayload(input: {
  employeeId: string;
  appUserId: string;
  identityHash: string;
  payloadJson: unknown;
  source: SnapshotSource;
  summaryPatchContext: SummaryPatchContext;
}) {
  const parsed = parseCachedPayload(input.payloadJson as never);
  if (!parsed?.ok) return null;

  const patched = await patchSummaryTargetsIfNeeded({
    ...input.summaryPatchContext,
    payload: parsed,
  });

  return persistSnapshotAndSyncState({
    employeeId: input.employeeId,
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    source: patched.usedNetwork ? "fresh" : input.source,
    payload: patched.payload,
    persistLinkArtifacts: patched.usedNetwork,
  });
}

export async function resolveEmployeeSyncReusableSnapshot(input: {
  employeeId: string;
  appUserId: string;
  identityHash: string;
  requestHash: string;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  subjectType: string | undefined;
  summaryPatchContext: SummaryPatchContext;
}): Promise<PersistedEmployeeSyncSnapshot | null> {
  const validCache = await getValidNhisFetchCache(
    input.appUserId,
    input.requestHash
  );
  if (validCache) {
    await markNhisFetchCacheHit(validCache.id).catch(() => undefined);
    const persisted = await tryPersistReusedPayload({
      employeeId: input.employeeId,
      appUserId: input.appUserId,
      identityHash: input.identityHash,
      payloadJson: validCache.payload,
      source: "cache-valid",
      summaryPatchContext: input.summaryPatchContext,
    });
    if (persisted) return persisted;
  }

  const historyCache = await getLatestNhisFetchCacheByIdentity({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    subjectType: input.subjectType,
  });
  if (historyCache) {
    const persisted = await tryPersistReusedPayload({
      employeeId: input.employeeId,
      appUserId: input.appUserId,
      identityHash: input.identityHash,
      payloadJson: historyCache.payload,
      source: "cache-history",
      summaryPatchContext: input.summaryPatchContext,
    });
    if (persisted) return persisted;
  }

  return null;
}
