import "server-only";

import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { resolveB2bEmployeeIdentity } from "@/lib/b2b/identity";
import {
  DEFAULT_DETAIL_YEAR_LIMIT,
  DEFAULT_NHIS_FETCH_TARGETS,
  type NhisFetchTarget,
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

export type B2bSyncNextAction = "init" | "sign" | "retry";

export class B2bEmployeeSyncError extends Error {
  readonly code: string;
  readonly reason: string;
  readonly status: number;
  readonly nextAction: B2bSyncNextAction;

  constructor(input: {
    message: string;
    code: string;
    reason: string;
    status: number;
    nextAction: B2bSyncNextAction;
  }) {
    super(input.message);
    this.name = "B2bEmployeeSyncError";
    this.code = input.code;
    this.reason = input.reason;
    this.status = input.status;
    this.nextAction = input.nextAction;
  }
}

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function resolveMedicationRows(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const medication = normalized?.medication;
  if (Array.isArray(medication)) return medication;
  const medicationRecord = asRecord(medication);
  if (!medicationRecord) return null;
  if (Array.isArray(medicationRecord.list)) return medicationRecord.list;
  if (Array.isArray(medicationRecord.rows)) return medicationRecord.rows;
  if (Array.isArray(medicationRecord.items)) return medicationRecord.items;
  return [];
}

function resolveCheckupRows(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const checkup = normalized?.checkup;
  if (Array.isArray(checkup)) return checkup;
  const checkupRecord = asRecord(checkup);
  if (!checkupRecord) return null;
  if (Array.isArray(checkupRecord.overview)) return checkupRecord.overview;
  if (Array.isArray(checkupRecord.list)) return checkupRecord.list;
  return [];
}

function resolveMissingSummaryTargets(normalizedJson: unknown) {
  const missing = new Set<NhisFetchTarget>();
  const medicationRows = resolveMedicationRows(normalizedJson);
  const checkupRows = resolveCheckupRows(normalizedJson);

  if (!medicationRows || medicationRows.length === 0) {
    missing.add("medication");
  }
  if (!checkupRows || checkupRows.length === 0) {
    missing.add("checkupOverview");
  }
  return [...missing];
}

function mergeSummaryNormalizedPayload(input: {
  baseNormalized: unknown;
  patchNormalized: unknown;
  targets: NhisFetchTarget[];
}) {
  const base = asRecord(input.baseNormalized) ?? {};
  const patch = asRecord(input.patchNormalized) ?? {};
  const merged: Record<string, unknown> = { ...base };

  if (input.targets.includes("medication") && patch.medication !== undefined) {
    merged.medication = patch.medication;
  }

  if (input.targets.includes("checkupOverview")) {
    const baseCheckup = asRecord(base.checkup) ?? {};
    const patchCheckup = asRecord(patch.checkup) ?? {};
    const mergedCheckup: Record<string, unknown> = { ...baseCheckup };
    if (patchCheckup.overview !== undefined) {
      mergedCheckup.overview = patchCheckup.overview;
    } else if (patch.checkup !== undefined && Array.isArray(patch.checkup)) {
      mergedCheckup.overview = patch.checkup;
    }
    merged.checkup = mergedCheckup;
  }

  return merged;
}

type SummaryPatchResult = {
  payload: NhisFetchRoutePayload;
  usedNetwork: boolean;
  patchedTargets: NhisFetchTarget[];
};

async function resolveSummaryPatchPayload(input: {
  appUserId: string;
  identityHash: string;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
}) {
  if (input.targets.length === 0) return null;

  const hashMeta = buildNhisFetchRequestHash({
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    fromDate: input.requestDefaults.fromDate,
    toDate: input.requestDefaults.toDate,
    subjectType: input.requestDefaults.subjectType,
  });

  const validCache = await getValidNhisFetchCache(
    input.appUserId,
    hashMeta.requestHash
  );
  if (validCache) {
    await markNhisFetchCacheHit(validCache.id).catch(() => undefined);
    const parsed = parseCachedPayload(validCache.payload);
    if (parsed?.ok) {
      return { payload: parsed, usedNetwork: false };
    }
  }

  const historyCache = await getLatestNhisFetchCacheByIdentity({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    subjectType: input.requestDefaults.subjectType,
  });
  if (historyCache) {
    const parsed = parseCachedPayload(historyCache.payload);
    if (parsed?.ok) {
      return { payload: parsed, usedNetwork: false };
    }
  }

  if (!input.linkCookieData) return null;

  const basePayload = buildBasePayload({
    linkLoginMethod: input.linkLoginMethod,
    linkLoginOrgCd: input.linkLoginOrgCd,
    linkCookieData: input.linkCookieData,
    requestDefaults: input.requestDefaults,
  });
  const detailPayload = buildDetailPayload(basePayload);
  const executed = await executeNhisFetch({
    targets: input.targets,
    effectiveYearLimit: input.effectiveYearLimit,
    basePayload,
    detailPayload,
    requestDefaults: input.requestDefaults,
  });

  await saveNhisFetchCache({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    requestHash: hashMeta.requestHash,
    requestKey: hashMeta.requestKey,
    targets: hashMeta.normalizedTargets,
    yearLimit: input.effectiveYearLimit,
    fromDate: input.requestDefaults.fromDate,
    toDate: input.requestDefaults.toDate,
    subjectType: input.requestDefaults.subjectType,
    statusCode: executed.payload.ok ? 200 : 502,
    payload: executed.payload,
  });

  if (!executed.payload.ok) return null;
  return { payload: executed.payload, usedNetwork: true };
}

async function patchSummaryTargetsIfNeeded(input: {
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
  const missingTargets = resolveMissingSummaryTargets(baseNormalized);
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
  });
  if (!patch) {
    return { payload: input.payload, usedNetwork: false, patchedTargets: [] };
  }

  const patchedNormalized = mergeSummaryNormalizedPayload({
    baseNormalized,
    patchNormalized: patch.payload.data?.normalized ?? null,
    targets: missingTargets,
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
    throw new B2bEmployeeSyncError({
      message: "연동 초기화가 필요합니다. 카카오 인증 요청을 먼저 진행해 주세요.",
      code: "NHIS_INIT_REQUIRED",
      reason: "nhis_init_required",
      status: 409,
      nextAction: "init",
    });
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
          const patched = await patchSummaryTargetsIfNeeded({
            appUserId: input.appUserId,
            identityHash: identity.identityHash,
            payload: parsed,
            effectiveYearLimit,
            requestDefaults,
            linkLoginMethod: link.loginMethod,
            linkLoginOrgCd: link.loginOrgCd,
            linkCookieData: link.cookieData,
          });
          const source = patched.usedNetwork ? "fresh" : "cache-valid";
          const normalizedJson = patched.payload.data?.normalized ?? null;
          const rawJson = buildSnapshotRawEnvelope({
            source,
            payload: patched.payload,
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
            source,
            payload: patched.payload,
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
          const patched = await patchSummaryTargetsIfNeeded({
            appUserId: input.appUserId,
            identityHash: identity.identityHash,
            payload: parsed,
            effectiveYearLimit,
            requestDefaults,
            linkLoginMethod: link.loginMethod,
            linkLoginOrgCd: link.loginOrgCd,
            linkCookieData: link.cookieData,
          });
          const source = patched.usedNetwork ? "fresh" : "cache-history";
          const normalizedJson = patched.payload.data?.normalized ?? null;
          const rawJson = buildSnapshotRawEnvelope({
            source,
            payload: patched.payload,
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
            source,
            payload: patched.payload,
            snapshot,
          };
        }
      }
    }

    if (!link.cookieData) {
      throw new B2bEmployeeSyncError({
        message: "인증 세션이 만료되었습니다. 인증을 다시 진행해 주세요.",
        code: "NHIS_SIGN_REQUIRED",
        reason: "nhis_sign_required",
        status: 409,
        nextAction: "sign",
      });
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
      const errCd = executed.firstFailed?.errCd?.trim().toUpperCase() || "";
      if (errCd === "LOGIN-999") {
        throw new B2bEmployeeSyncError({
          message: "인증 세션이 만료되었습니다. 카카오 인증을 다시 진행해 주세요.",
          code: "NHIS_AUTH_EXPIRED",
          reason: "nhis_auth_expired",
          status: 409,
          nextAction: "init",
        });
      }
      throw new B2bEmployeeSyncError({
        message:
          executed.payload.error ||
          executed.firstFailed?.errMsg ||
          "건강 데이터를 불러오지 못했습니다.",
        code: "HYPHEN_FETCH_FAILED",
        reason: "hyphen_fetch_failed",
        status: 502,
        nextAction: "retry",
      });
    }

    const patched = await patchSummaryTargetsIfNeeded({
      appUserId: input.appUserId,
      identityHash: identity.identityHash,
      payload: executed.payload,
      effectiveYearLimit,
      requestDefaults,
      linkLoginMethod: link.loginMethod,
      linkLoginOrgCd: link.loginOrgCd,
      linkCookieData: link.cookieData,
    });
    const normalizedJson = patched.payload.data?.normalized ?? null;
    const rawJson = buildSnapshotRawEnvelope({
      source: "fresh",
      payload: patched.payload,
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
      payload: patched.payload,
      snapshot,
    };
  });
}
