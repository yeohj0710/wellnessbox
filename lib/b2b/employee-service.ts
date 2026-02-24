import "server-only";

import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { resolveB2bEmployeeIdentity } from "@/lib/b2b/identity";
import {
  DEFAULT_DETAIL_YEAR_LIMIT,
  DEFAULT_NHIS_FETCH_TARGETS,
  type NhisFetchRoutePayload,
} from "@/lib/server/hyphen/fetch-contract";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import {
  buildNhisFetchRequestHash,
  getLatestNhisFetchCacheByIdentity,
  getValidNhisFetchCache,
  markNhisFetchCacheHit,
  resolveNhisIdentityHash,
  runWithNhisFetchDedup,
  saveNhisFetchCache,
} from "@/lib/server/hyphen/fetch-cache";
import { getNhisLink } from "@/lib/server/hyphen/link";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import type { HyphenNhisRequestPayload } from "@/lib/server/hyphen/client";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { periodKeyToCycle, resolveCurrentPeriodKey } from "@/lib/b2b/period";

function asJsonValue(
  value: unknown
): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  if (value == null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeIp(value: string | null | undefined) {
  if (!value) return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function hashIp(value: string | null | undefined) {
  const normalized = normalizeIp(value);
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

function buildBasePayload(input: {
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
}): HyphenNhisRequestPayload {
  return {
    loginMethod: (input.linkLoginMethod as "EASY" | "CERT" | null) ?? "EASY",
    loginOrgCd: input.linkLoginOrgCd ?? undefined,
    ...input.requestDefaults,
    cookieData: input.linkCookieData ?? undefined,
    showCookie: "Y" as const,
  };
}

function buildDetailPayload(
  basePayload: HyphenNhisRequestPayload
): HyphenNhisRequestPayload {
  return { ...basePayload, detailYn: "Y" as const, imgYn: "N" as const };
}

function parseCachedPayload(
  payload: Prisma.JsonValue
): NhisFetchRoutePayload | null {
  try {
    return JSON.parse(JSON.stringify(payload)) as NhisFetchRoutePayload;
  } catch {
    return null;
  }
}

function buildSnapshotRawEnvelope(input: {
  source: "cache-valid" | "cache-history" | "fresh";
  payload: NhisFetchRoutePayload;
}) {
  return {
    meta: {
      ok: input.payload.ok,
      partial: input.payload.partial === true,
      failed: input.payload.failed ?? [],
      source: input.source,
      capturedAt: new Date().toISOString(),
    },
    raw: input.payload.data?.raw ?? null,
  };
}

async function createB2bHealthSnapshot(input: {
  employeeId: string;
  normalizedJson: unknown;
  rawJson: unknown;
  fetchedAt?: Date;
}) {
  const fetchedAt = input.fetchedAt ?? new Date();
  const periodKey = resolveCurrentPeriodKey(fetchedAt);
  const reportCycle = periodKeyToCycle(periodKey);
  return db.b2bHealthDataSnapshot.create({
    data: {
      employeeId: input.employeeId,
      provider: HYPHEN_PROVIDER,
      sourceMode: process.env.HYPHEN_MOCK_MODE === "1" ? "mock" : "hyphen",
      rawJson: asJsonValue(input.rawJson),
      normalizedJson: asJsonValue(input.normalizedJson),
      fetchedAt,
      periodKey,
      reportCycle: reportCycle ?? null,
    },
  });
}

export async function upsertB2bEmployee(input: {
  appUserId: string;
  name: string;
  birthDate: string;
  phone: string;
}) {
  const identity = resolveB2bEmployeeIdentity({
    name: input.name,
    birthDate: input.birthDate,
    phone: input.phone,
  });

  const employee = await db.b2bEmployee.upsert({
    where: { identityHash: identity.identityHash },
    create: {
      appUserId: input.appUserId,
      name: identity.name,
      birthDate: identity.birthDate,
      phoneNormalized: identity.phoneNormalized,
      identityHash: identity.identityHash,
      linkedProvider: HYPHEN_PROVIDER,
    },
    update: {
      appUserId: input.appUserId,
      name: identity.name,
      birthDate: identity.birthDate,
      phoneNormalized: identity.phoneNormalized,
      linkedProvider: HYPHEN_PROVIDER,
      updatedAt: new Date(),
    },
  });

  return {
    employee,
    identity,
  };
}

export async function logB2bEmployeeAccess(input: {
  employeeId?: string | null;
  appUserId?: string | null;
  action: string;
  route?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  payload?: unknown;
}) {
  await db.b2bEmployeeAccessLog.create({
    data: {
      employeeId: input.employeeId ?? null,
      appUserId: input.appUserId ?? null,
      action: input.action,
      route: input.route ?? null,
      ipHash: hashIp(input.ip),
      userAgent: input.userAgent ?? null,
      payload: asJsonValue(input.payload),
    },
  });
}

export async function logB2bAdminAction(input: {
  employeeId?: string | null;
  action: string;
  actorTag?: string | null;
  payload?: unknown;
}) {
  await db.b2bAdminActionLog.create({
    data: {
      employeeId: input.employeeId ?? null,
      action: input.action,
      actorTag: input.actorTag ?? null,
      payload: asJsonValue(input.payload),
    },
  });
}

export async function fetchAndStoreB2bHealthSnapshot(input: {
  appUserId: string;
  employeeId: string;
  identity: {
    identityHash: string;
    name: string;
    birthDate: string;
    phoneNormalized: string;
  };
  forceRefresh?: boolean;
}) {
  const link = await getNhisLink(input.appUserId);
  if (!link?.linked) {
    throw new Error("연동된 하이픈 인증 세션이 없습니다.");
  }

  const requestDefaults = buildNhisRequestDefaults();
  const targets = [...DEFAULT_NHIS_FETCH_TARGETS];
  const effectiveYearLimit = DEFAULT_DETAIL_YEAR_LIMIT;

  const identity = resolveNhisIdentityHash({
    appUserId: input.appUserId,
    loginOrgCd: link.loginOrgCd,
    resNm: input.identity.name,
    resNo: input.identity.birthDate,
    mobileNo: input.identity.phoneNormalized,
    storedIdentityHash: input.identity.identityHash,
  });

  const requestHashMeta = buildNhisFetchRequestHash({
    identityHash: identity.identityHash,
    targets,
    yearLimit: effectiveYearLimit,
    fromDate: requestDefaults.fromDate,
    toDate: requestDefaults.toDate,
    subjectType: requestDefaults.subjectType,
  });
  const dedupeKey = `${input.employeeId}|${requestHashMeta.requestHash}|${
    input.forceRefresh ? "force" : "normal"
  }`;

  return runWithNhisFetchDedup(dedupeKey, async () => {
    if (!input.forceRefresh) {
      const cached = await getValidNhisFetchCache(
        input.appUserId,
        requestHashMeta.requestHash
      );
      if (cached) {
        await markNhisFetchCacheHit(cached.id).catch(() => undefined);
        const parsed = parseCachedPayload(cached.payload);
        if (parsed?.ok) {
          const normalizedJson = parsed.data?.normalized ?? null;
          const rawJson = buildSnapshotRawEnvelope({
            source: "cache-valid",
            payload: parsed,
          });
          const snapshot = await createB2bHealthSnapshot({
            employeeId: input.employeeId,
            normalizedJson,
            rawJson,
          });
          await db.b2bEmployee.update({
            where: { id: input.employeeId },
            data: {
              lastSyncedAt: new Date(),
            },
          });
          return {
            source: "cache-valid" as const,
            payload: parsed,
            snapshot,
          };
        }
      }

      const historyCache = await getLatestNhisFetchCacheByIdentity({
        appUserId: input.appUserId,
        identityHash: identity.identityHash,
        targets,
        yearLimit: effectiveYearLimit,
        subjectType: requestDefaults.subjectType,
      });
      if (historyCache) {
        const parsed = parseCachedPayload(historyCache.payload);
        if (parsed?.ok) {
          const normalizedJson = parsed.data?.normalized ?? null;
          const rawJson = buildSnapshotRawEnvelope({
            source: "cache-history",
            payload: parsed,
          });
          const snapshot = await createB2bHealthSnapshot({
            employeeId: input.employeeId,
            normalizedJson,
            rawJson,
          });
          await db.b2bEmployee.update({
            where: { id: input.employeeId },
            data: {
              lastSyncedAt: new Date(),
            },
          });
          return {
            source: "cache-history" as const,
            payload: parsed,
            snapshot,
          };
        }
      }
    }

    if (!link.cookieData) {
      throw new Error("연동된 하이픈 인증 세션이 없습니다.");
    }

    const basePayload = buildBasePayload({
      linkLoginMethod: link.loginMethod,
      linkLoginOrgCd: link.loginOrgCd,
      linkCookieData: link.cookieData,
      requestDefaults,
    });
    const detailPayload = buildDetailPayload(basePayload);

    const executed = await executeNhisFetch({
      targets,
      effectiveYearLimit,
      basePayload,
      detailPayload,
      requestDefaults,
    });

    await saveNhisFetchCache({
      appUserId: input.appUserId,
      identityHash: identity.identityHash,
      requestHash: requestHashMeta.requestHash,
      requestKey: requestHashMeta.requestKey,
      targets: requestHashMeta.normalizedTargets,
      yearLimit: effectiveYearLimit,
      fromDate: requestDefaults.fromDate,
      toDate: requestDefaults.toDate,
      subjectType: requestDefaults.subjectType,
      statusCode: executed.payload.ok ? 200 : 502,
      payload: executed.payload,
    });

    if (!executed.payload.ok) {
      throw new Error(
        executed.payload.error ||
          executed.firstFailed?.errMsg ||
          "건강 데이터를 불러오지 못했습니다."
      );
    }

    const normalizedJson = executed.payload.data?.normalized ?? null;
    const rawJson = buildSnapshotRawEnvelope({
      source: "fresh",
      payload: executed.payload,
    });

    const snapshot = await createB2bHealthSnapshot({
      employeeId: input.employeeId,
      normalizedJson,
      rawJson,
    });

    await db.b2bEmployee.update({
      where: { id: input.employeeId },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    return {
      source: "fresh" as const,
      payload: executed.payload,
      snapshot,
    };
  });
}
