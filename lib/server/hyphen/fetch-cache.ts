import "server-only";

import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { runWithHyphenInFlightDedup } from "@/lib/server/hyphen/inflight-dedup";

type FetchLikePayload = {
  ok: boolean;
  partial?: boolean;
  failed?: unknown;
  data?: unknown;
  error?: string;
  [key: string]: unknown;
};

type IdentitySource = "pii" | "stored" | "appUser";

type ResolveIdentityInput = {
  appUserId: string;
  loginOrgCd?: string | null;
  resNm?: string | null;
  resNo?: string | null;
  mobileNo?: string | null;
  storedIdentityHash?: string | null;
};

type BuildRequestHashInput = {
  identityHash: string;
  targets: string[];
  yearLimit?: number;
  fromDate?: string;
  toDate?: string;
  subjectType?: string;
};

type SaveFetchCacheInput = {
  appUserId: string;
  identityHash: string;
  requestHash: string;
  requestKey: string;
  targets: string[];
  yearLimit?: number;
  fromDate?: string;
  toDate?: string;
  subjectType?: string;
  statusCode: number;
  payload: FetchLikePayload;
};

type IdentityCacheLookupInput = {
  appUserId: string;
  identityHash: string;
  targets: string[];
  yearLimit?: number;
  subjectType?: string;
};

type IdentityCacheQueryMode = {
  includeExpired: boolean;
  okOnly: boolean;
};

const DEFAULT_HASH_SALT = "wellnessbox-hyphen-cache-v1";
const DEFAULT_SUMMARY_TTL_MINUTES = 60 * 12;
const DEFAULT_DETAIL_TTL_MINUTES = 60 * 24 * 3;
const DEFAULT_PARTIAL_TTL_MINUTES = 60 * 2;
const DEFAULT_FAILURE_TTL_MINUTES = 10;

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeDigits(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "");
}

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function cacheSalt() {
  const salt = normalizeText(process.env.HYPHEN_NHIS_CACHE_HASH_SALT);
  return salt || DEFAULT_HASH_SALT;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashWithSalt(value: string) {
  return sha256(`${cacheSalt()}|${value}`);
}

function asJsonValue(
  value: unknown
): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  if (value == null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function resolveCacheTtlMinutes(targets: string[], payload: FetchLikePayload) {
  if (!payload.ok) {
    return envNumber("HYPHEN_NHIS_FAILURE_CACHE_TTL_MINUTES", DEFAULT_FAILURE_TTL_MINUTES);
  }

  if (payload.partial) {
    return envNumber("HYPHEN_NHIS_PARTIAL_CACHE_TTL_MINUTES", DEFAULT_PARTIAL_TTL_MINUTES);
  }

  if (targets.includes("checkupYearly") || targets.includes("checkupList")) {
    return envNumber("HYPHEN_NHIS_DETAIL_CACHE_TTL_MINUTES", DEFAULT_DETAIL_TTL_MINUTES);
  }

  return envNumber("HYPHEN_NHIS_SUMMARY_CACHE_TTL_MINUTES", DEFAULT_SUMMARY_TTL_MINUTES);
}

export function resolveNhisIdentityHash(input: ResolveIdentityInput): {
  identityHash: string;
  source: IdentitySource;
} {
  const org = normalizeText(input.loginOrgCd).toLowerCase();
  const name = normalizeText(input.resNm).toLowerCase().replace(/\s+/g, "");
  const birth = normalizeDigits(input.resNo);
  const mobile = normalizeDigits(input.mobileNo);

  if (org && name && /^\d{8}$/.test(birth) && /^\d{10,11}$/.test(mobile)) {
    return {
      identityHash: hashWithSalt(`pii|${org}|${name}|${birth}|${mobile}`),
      source: "pii",
    };
  }

  const stored = normalizeText(input.storedIdentityHash);
  if (stored) {
    return {
      identityHash: stored,
      source: "stored",
    };
  }

  return {
    identityHash: hashWithSalt(`app-user|${input.appUserId}`),
    source: "appUser",
  };
}

export function buildNhisFetchRequestHash(input: BuildRequestHashInput) {
  const normalizedTargets = [...new Set(input.targets.map((target) => target.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

  const requestKey = [
    `targets=${normalizedTargets.join(",") || "none"}`,
    `yearLimit=${input.yearLimit ?? "-"}`,
    `from=${input.fromDate ?? "-"}`,
    `to=${input.toDate ?? "-"}`,
    `subjectType=${input.subjectType ?? "-"}`,
  ].join("|");

  const requestHash = hashWithSalt(`${input.identityHash}|${requestKey}`);
  return {
    requestHash,
    requestKey,
    normalizedTargets,
  };
}

export async function getValidNhisFetchCache(appUserId: string, requestHash: string) {
  const now = new Date();
  const cached = await db.healthProviderFetchCache.findUnique({
    where: {
      appUserId_provider_requestHash: {
        appUserId,
        provider: HYPHEN_PROVIDER,
        requestHash,
      },
    },
  });

  if (!cached) return null;
  if (cached.expiresAt <= now) return null;
  return cached;
}

export async function getValidNhisFetchCacheByIdentity(input: IdentityCacheLookupInput) {
  return findNhisFetchCacheByIdentity(input, {
    includeExpired: false,
    okOnly: true,
  });
}

export async function getLatestNhisFetchCacheByIdentity(input: IdentityCacheLookupInput) {
  return findNhisFetchCacheByIdentity(input, {
    includeExpired: true,
    okOnly: true,
  });
}

async function findNhisFetchCacheByIdentity(
  input: IdentityCacheLookupInput,
  mode: IdentityCacheQueryMode
) {
  const now = new Date();
  const normalizedTargets = [...new Set(input.targets.map((target) => target.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

  const where: Prisma.HealthProviderFetchCacheWhereInput = {
    appUserId: input.appUserId,
    provider: HYPHEN_PROVIDER,
    identityHash: input.identityHash,
    targets: { equals: normalizedTargets },
    yearLimit: input.yearLimit ?? null,
    subjectType: input.subjectType ?? null,
    ...(mode.okOnly ? { ok: true } : {}),
    ...(mode.includeExpired ? {} : { expiresAt: { gt: now } }),
  };

  const cached = await db.healthProviderFetchCache.findFirst({
    where,
    orderBy: { fetchedAt: "desc" },
  });

  return cached;
}

export async function getLatestNhisFetchAttemptAt(appUserId: string) {
  try {
    const latestAttempt = await db.healthProviderFetchAttempt.findFirst({
      where: {
        appUserId,
        provider: HYPHEN_PROVIDER,
        cached: false,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (latestAttempt?.createdAt) return latestAttempt.createdAt;
  } catch (error) {
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2021"
      )
    ) {
      throw error;
    }
  }

  const latestCached = await db.healthProviderFetchCache.findFirst({
    where: {
      appUserId,
      provider: HYPHEN_PROVIDER,
    },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });

  return latestCached?.fetchedAt ?? null;
}

export async function saveNhisFetchCache(input: SaveFetchCacheInput) {
  const now = new Date();
  const ttlMinutes = resolveCacheTtlMinutes(input.targets, input.payload);
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  return db.healthProviderFetchCache.upsert({
    where: {
      appUserId_provider_requestHash: {
        appUserId: input.appUserId,
        provider: HYPHEN_PROVIDER,
        requestHash: input.requestHash,
      },
    },
    create: {
      appUserId: input.appUserId,
      provider: HYPHEN_PROVIDER,
      identityHash: input.identityHash,
      requestHash: input.requestHash,
      requestKey: input.requestKey,
      targets: input.targets,
      yearLimit: input.yearLimit ?? null,
      fromDate: input.fromDate ?? null,
      toDate: input.toDate ?? null,
      subjectType: input.subjectType ?? null,
      statusCode: input.statusCode,
      ok: input.payload.ok,
      partial: !!input.payload.partial,
      payload: asJsonValue(input.payload),
      fetchedAt: now,
      expiresAt,
      hitCount: 0,
      lastHitAt: null,
    },
    update: {
      identityHash: input.identityHash,
      requestKey: input.requestKey,
      targets: input.targets,
      yearLimit: input.yearLimit ?? null,
      fromDate: input.fromDate ?? null,
      toDate: input.toDate ?? null,
      subjectType: input.subjectType ?? null,
      statusCode: input.statusCode,
      ok: input.payload.ok,
      partial: !!input.payload.partial,
      payload: asJsonValue(input.payload),
      fetchedAt: now,
      expiresAt,
      hitCount: 0,
      lastHitAt: null,
    },
  });
}

export async function markNhisFetchCacheHit(cacheId: string) {
  return db.healthProviderFetchCache.update({
    where: { id: cacheId },
    data: {
      hitCount: { increment: 1 },
      lastHitAt: new Date(),
    },
  });
}

export async function clearNhisFetchCaches(appUserId: string) {
  return db.healthProviderFetchCache.deleteMany({
    where: {
      appUserId,
      provider: HYPHEN_PROVIDER,
    },
  });
}

export async function runWithNhisFetchDedup<T>(
  key: string,
  runner: () => Promise<T>
): Promise<T> {
  return runWithHyphenInFlightDedup("nhis-fetch", key, runner);
}
