import "server-only";

import { createHash } from "crypto";
import db from "@/lib/db";
import { resolveB2bEmployeeIdentity } from "@/lib/b2b/identity";
import {
  DEFAULT_DETAIL_YEAR_LIMIT,
  DEFAULT_NHIS_FETCH_TARGETS,
} from "@/lib/server/hyphen/fetch-contract";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import {
  buildNhisFetchRequestHash,
  clearNhisFetchCaches,
  getLatestNhisFetchCacheByIdentity,
  getValidNhisFetchCache,
  markNhisFetchCacheHit,
  resolveNhisIdentityHash,
  runWithNhisFetchDedup,
  saveNhisFetchCache,
} from "@/lib/server/hyphen/fetch-cache";
import { getNhisLink } from "@/lib/server/hyphen/link";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import {
  buildBasePayload,
  buildDetailPayload,
  parseCachedPayload,
  patchSummaryTargetsIfNeeded,
} from "@/lib/b2b/employee-sync-summary";
import {
  asJsonValue,
  persistSnapshotAndSyncState,
} from "@/lib/b2b/employee-sync-snapshot";

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
    const summaryPatchContext = {
      appUserId: input.appUserId,
      identityHash: identity.identityHash,
      effectiveYearLimit,
      requestDefaults,
      linkLoginMethod: link.loginMethod,
      linkLoginOrgCd: link.loginOrgCd,
      linkCookieData: link.cookieData,
    };

    if (input.forceRefresh) {
      await clearNhisFetchCaches(input.appUserId).catch((error) => {
        console.error("[b2b][employee-sync] failed to clear NHIS cache before force refresh", {
          appUserId: input.appUserId,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }

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
            ...summaryPatchContext,
            payload: parsed,
          });
          const source = patched.usedNetwork ? "fresh" : "cache-valid";
          return persistSnapshotAndSyncState({
            employeeId: input.employeeId,
            appUserId: input.appUserId,
            identityHash: identity.identityHash,
            source,
            payload: patched.payload,
            persistLinkArtifacts: patched.usedNetwork,
          });
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
            ...summaryPatchContext,
            payload: parsed,
          });
          const source = patched.usedNetwork ? "fresh" : "cache-history";
          return persistSnapshotAndSyncState({
            employeeId: input.employeeId,
            appUserId: input.appUserId,
            identityHash: identity.identityHash,
            source,
            payload: patched.payload,
            persistLinkArtifacts: patched.usedNetwork,
          });
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
      if (errCd === "LOGIN-999" || errCd === "C0012-001") {
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
      ...summaryPatchContext,
      payload: executed.payload,
    });
    return persistSnapshotAndSyncState({
      employeeId: input.employeeId,
      appUserId: input.appUserId,
      identityHash: identity.identityHash,
      source: "fresh",
      payload: patched.payload,
      persistLinkArtifacts: true,
    });
  });
}
