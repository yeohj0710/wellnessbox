import type { NhisFetchBudgetDecision } from "@/lib/server/hyphen/fetch-attempt";
import { tryServeNhisFetchCache } from "@/lib/server/hyphen/fetch-route-cache";
import {
  buildFetchBudgetBlockedResponse as buildFetchBudgetBlockedResponseSupport,
  tryServeForceRefreshGate,
} from "@/lib/server/hyphen/fetch-route-gate-support";

type RequestHashMeta = {
  requestHash: string;
  normalizedTargets: string[];
};

type TryServeFetchGateInput = {
  forceRefresh: boolean;
  appUserId: string;
  requestHashMeta: RequestHashMeta;
  shouldUpdateIdentityHash: boolean;
  identityHash: string;
  yearLimit: number;
  subjectType: string;
  lastFetchedAt: Date | null | undefined;
  latestFetchAttemptAt: Date | null;
};

type BlockedBudgetDecision = Extract<NhisFetchBudgetDecision, { available: false }>;

export async function tryServeFetchGateCache(
  input: TryServeFetchGateInput
) {
  if (input.forceRefresh) {
    return tryServeForceRefreshGate(input);
  }

  return tryServeNhisFetchCache({
    appUserId: input.appUserId,
    requestHash: input.requestHashMeta.requestHash,
    shouldUpdateIdentityHash: input.shouldUpdateIdentityHash,
    identityHash: input.identityHash,
    targets: input.requestHashMeta.normalizedTargets,
    yearLimit: input.yearLimit,
    subjectType: input.subjectType,
    allowHistoryFallback: true,
  });
}

export function buildFetchBudgetBlockedResponse(
  fetchBudget: BlockedBudgetDecision
) {
  return buildFetchBudgetBlockedResponseSupport(fetchBudget);
}
