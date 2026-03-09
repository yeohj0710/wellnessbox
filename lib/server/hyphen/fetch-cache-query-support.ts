import "server-only";

import { Prisma } from "@prisma/client";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { normalizeNhisFetchTargets } from "@/lib/server/hyphen/fetch-cache-support";

export type IdentityCacheLookupInput = {
  appUserId: string;
  identityHash: string;
  targets: string[];
  yearLimit?: number;
  subjectType?: string;
};

export type IdentityGlobalCacheLookupInput = {
  identityHash: string;
  targets: string[];
  yearLimit?: number;
  subjectType?: string;
  excludeAppUserId?: string;
};

export type IdentityCacheQueryMode = {
  includeExpired: boolean;
  okOnly: boolean;
};

export function buildIdentityCacheLookupWhere(
  input: IdentityCacheLookupInput,
  mode: IdentityCacheQueryMode,
  now: Date
): Prisma.HealthProviderFetchCacheWhereInput {
  const normalizedTargets = normalizeNhisFetchTargets(input.targets);
  return {
    appUserId: input.appUserId,
    provider: HYPHEN_PROVIDER,
    identityHash: input.identityHash,
    targets: { equals: normalizedTargets },
    yearLimit: input.yearLimit ?? null,
    subjectType: input.subjectType ?? null,
    ...(mode.okOnly ? { ok: true } : {}),
    ...(mode.includeExpired ? {} : { expiresAt: { gt: now } }),
  };
}

export function buildIdentityGlobalCacheLookupWhere(
  input: IdentityGlobalCacheLookupInput
): Prisma.HealthProviderFetchCacheWhereInput {
  const normalizedTargets = normalizeNhisFetchTargets(input.targets);
  return {
    provider: HYPHEN_PROVIDER,
    identityHash: input.identityHash,
    targets: { equals: normalizedTargets },
    yearLimit: input.yearLimit ?? null,
    subjectType: input.subjectType ?? null,
    ok: true,
    ...(input.excludeAppUserId
      ? { appUserId: { not: input.excludeAppUserId } }
      : {}),
  };
}
