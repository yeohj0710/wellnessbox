import { z } from "zod";
import {
  evaluateNhisFetchBudget,
} from "@/lib/server/hyphen/fetch-attempt";
import {
  getLatestNhisFetchAttemptAt,
} from "@/lib/server/hyphen/fetch-cache";
import {
  NHIS_FETCH_TARGETS,
  type NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import {
  resolveNhisFetchRequestContext,
} from "@/lib/server/hyphen/fetch-route-request-context";
import {
  buildBlockedTargetsResponse,
  buildInitRequiredFetchResponse,
  buildMissingCookieSessionResponse,
} from "@/lib/server/hyphen/fetch-route-readiness-support";
import type {
  ResolveFetchExecutionContext,
  ResolveFetchExecutionInput,
} from "@/lib/server/hyphen/fetch-route-types";
import {
  buildFetchBudgetBlockedResponse,
  tryServeFetchGateCache,
} from "@/lib/server/hyphen/fetch-route-gate";
import { dedupeNhisFetchTargets } from "@/lib/server/hyphen/fetch-request-policy";
import { getNhisLink } from "@/lib/server/hyphen/link";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import { resolveBlockedNhisFetchTargets } from "@/lib/server/hyphen/target-policy";

export {
  NHIS_INIT_REQUIRED_ERR_CODE,
  NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE,
  resolveFailedNhisFetchResponse,
} from "@/lib/server/hyphen/fetch-route-readiness-support";
export {
  executeAndPersistNhisFetch,
  enrichNhisPayloadWithAiSummarySafe,
  normalizeFailedCodes,
  recordNhisFetchAttemptSafe,
  resolveNhisFetchFailedStatusCode,
} from "@/lib/server/hyphen/fetch-route-persist";

const targetEnum = z.enum(NHIS_FETCH_TARGETS);

export const fetchSchema = z
  .object({
    targets: z.array(targetEnum).min(1).optional(),
    yearLimit: z.number().int().min(1).max(5).optional(),
    forceRefresh: z.boolean().optional(),
  })
  .optional();

export function dedupeTargets(input?: NhisFetchTarget[]) {
  return dedupeNhisFetchTargets(input);
}

export async function resolveFetchExecutionContext(
  input: ResolveFetchExecutionInput
): Promise<
  | { ready: false; response: Response }
  | { ready: true; context: ResolveFetchExecutionContext }
> {
  const blockedTargets = resolveBlockedNhisFetchTargets(input.targets);
  if (blockedTargets.length > 0) {
    return {
      ready: false,
      response: buildBlockedTargetsResponse(blockedTargets),
    };
  }

  const [link, latestFetchAttemptAt] = await Promise.all([
    getNhisLink(input.appUserId),
    input.forceRefresh
      ? getLatestNhisFetchAttemptAt(input.appUserId)
      : Promise.resolve(null),
  ]);
  const requestDefaults = buildNhisRequestDefaults();

  if (!link?.linked) {
    return {
      ready: false,
      response: buildInitRequiredFetchResponse(),
    };
  }

  const requestContext = resolveNhisFetchRequestContext({
    appUserId: input.appUserId,
    link,
    targets: input.targets,
    effectiveYearLimit: input.effectiveYearLimit,
    requestDefaults,
  });

  const gateCacheResponse = await tryServeFetchGateCache({
    forceRefresh: input.forceRefresh,
    appUserId: input.appUserId,
    requestHashMeta: requestContext.requestHashMeta,
    shouldUpdateIdentityHash: requestContext.shouldUpdateIdentityHash,
    identityHash: requestContext.identityHash,
    yearLimit: input.effectiveYearLimit,
    subjectType: requestDefaults.subjectType,
    lastFetchedAt: link.lastFetchedAt,
    latestFetchAttemptAt,
  });
  if (gateCacheResponse) {
    return {
      ready: false,
      response: gateCacheResponse,
    };
  }

  if (!link.cookieData) {
    return {
      ready: false,
      response: buildMissingCookieSessionResponse(),
    };
  }

  const fetchBudget = await evaluateNhisFetchBudget({
    appUserId: input.appUserId,
    forceRefresh: input.forceRefresh,
  });
  if (!fetchBudget.available) {
    return {
      ready: false,
      response: buildFetchBudgetBlockedResponse(fetchBudget),
    };
  }

  return {
    ready: true,
    context: {
      appUserId: input.appUserId,
      identityHash: requestContext.identityHash,
      requestHashMeta: requestContext.requestHashMeta,
      targets: input.targets,
      effectiveYearLimit: input.effectiveYearLimit,
      requestDefaults,
      forceRefresh: input.forceRefresh,
      basePayload: requestContext.basePayload,
      detailPayload: requestContext.detailPayload,
    },
  };
}
