import { runWithNhisFetchDedup } from "@/lib/server/hyphen/fetch-cache";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import { persistNhisFetchResult } from "@/lib/server/hyphen/fetch-route-cache";
import type {
  ExecuteAndPersistNhisFetchResult,
  NhisFetchFirstFailed,
  NhisFetchPayload,
  ResolveFetchExecutionContext,
} from "@/lib/server/hyphen/fetch-route-types";
export {
  enrichNhisPayloadWithAiSummarySafe,
  normalizeFailedCodes,
  recordNhisFetchAttemptSafe,
  resolveNhisFetchFailedStatusCode,
} from "@/lib/server/hyphen/fetch-route-persist-support";
import {
  enrichNhisPayloadWithAiSummarySafe,
  recordNhisFetchAttemptSafe,
  resolveNhisFetchFailedStatusCode,
} from "@/lib/server/hyphen/fetch-route-persist-support";

async function persistFailedNhisFetch(input: {
  context: ResolveFetchExecutionContext;
  firstFailed: NhisFetchFirstFailed;
  payload: NhisFetchPayload;
  statusCode: number;
}) {
  await persistNhisFetchResult({
    appUserId: input.context.appUserId,
    identityHash: input.context.identityHash,
    requestHash: input.context.requestHashMeta.requestHash,
    requestKey: input.context.requestHashMeta.requestKey,
    targets: input.context.requestHashMeta.normalizedTargets,
    yearLimit: input.context.effectiveYearLimit,
    requestDefaults: input.context.requestDefaults,
    statusCode: input.statusCode,
    payload: input.payload,
    firstFailed: input.firstFailed,
    updateFetchedAt: false,
  });
  await recordNhisFetchAttemptSafe({
    appUserId: input.context.appUserId,
    identityHash: input.context.identityHash,
    requestHash: input.context.requestHashMeta.requestHash,
    requestKey: input.context.requestHashMeta.requestKey,
    forceRefresh: input.context.forceRefresh,
    statusCode: input.statusCode,
    ok: false,
  });
}

async function persistSuccessfulNhisFetch(input: {
  context: ResolveFetchExecutionContext;
  firstFailed: NhisFetchFirstFailed;
  payload: NhisFetchPayload;
}) {
  await persistNhisFetchResult({
    appUserId: input.context.appUserId,
    identityHash: input.context.identityHash,
    requestHash: input.context.requestHashMeta.requestHash,
    requestKey: input.context.requestHashMeta.requestKey,
    targets: input.context.requestHashMeta.normalizedTargets,
    yearLimit: input.context.effectiveYearLimit,
    requestDefaults: input.context.requestDefaults,
    statusCode: 200,
    payload: input.payload,
    firstFailed: input.firstFailed,
    updateFetchedAt: true,
  });
  await recordNhisFetchAttemptSafe({
    appUserId: input.context.appUserId,
    identityHash: input.context.identityHash,
    requestHash: input.context.requestHashMeta.requestHash,
    requestKey: input.context.requestHashMeta.requestKey,
    forceRefresh: input.context.forceRefresh,
    statusCode: 200,
    ok: true,
  });
}

export async function executeAndPersistNhisFetch(
  input: ResolveFetchExecutionContext
): Promise<ExecuteAndPersistNhisFetchResult> {
  const dedupKey = `${input.appUserId}|${input.requestHashMeta.requestHash}`;
  return runWithNhisFetchDedup(dedupKey, async () => {
    try {
      const executed = await executeNhisFetch({
        targets: input.targets,
        effectiveYearLimit: input.effectiveYearLimit,
        basePayload: input.basePayload,
        detailPayload: input.detailPayload,
        requestDefaults: input.requestDefaults,
      });
      const payloadWithAiSummary = await enrichNhisPayloadWithAiSummarySafe(
        executed.payload
      );
      if (!payloadWithAiSummary.ok) {
        const failedStatusCode = resolveNhisFetchFailedStatusCode({
          firstFailed: executed.firstFailed,
          payload: payloadWithAiSummary,
        });
        await persistFailedNhisFetch({
          context: input,
          firstFailed: executed.firstFailed,
          payload: payloadWithAiSummary,
          statusCode: failedStatusCode,
        });
        return { statusCode: failedStatusCode, payload: payloadWithAiSummary };
      }

      await persistSuccessfulNhisFetch({
        context: input,
        firstFailed: executed.firstFailed,
        payload: payloadWithAiSummary,
      });
      return { statusCode: 200, payload: payloadWithAiSummary };
    } catch (error) {
      await recordNhisFetchAttemptSafe({
        appUserId: input.appUserId,
        identityHash: input.identityHash,
        requestHash: input.requestHashMeta.requestHash,
        requestKey: input.requestHashMeta.requestKey,
        forceRefresh: input.forceRefresh,
        statusCode: 500,
        ok: false,
      });
      throw error;
    }
  });
}
