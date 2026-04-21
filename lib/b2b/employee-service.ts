import "server-only";

import db from "@/lib/db";
import { resolveB2bEmployeeIdentity } from "@/lib/b2b/identity";
import {
  mergeDuplicateB2bEmployeesForIdentity,
  reconcileMatchedB2bEmployeeIdentity,
} from "@/lib/b2b/employee-identity-match";
import {
  DEFAULT_DETAIL_YEAR_LIMIT,
  DEFAULT_NHIS_FETCH_TARGETS,
} from "@/lib/server/hyphen/fetch-contract";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import {
  buildNhisFetchRequestHash,
  clearNhisFetchCaches,
  resolveNhisIdentityHash,
  runWithNhisFetchDedup,
  saveNhisFetchCache,
} from "@/lib/server/hyphen/fetch-cache";
import { clearNhisFetchMemoryCacheForUser } from "@/lib/server/hyphen/fetch-memory-cache";
import { getNhisLink } from "@/lib/server/hyphen/link";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import {
  buildBasePayload,
  buildDetailPayload,
  patchSummaryTargetsIfNeeded,
} from "@/lib/b2b/employee-sync-summary";
import { resolveEmployeeSyncReusableSnapshot } from "@/lib/b2b/employee-service-cache-reuse";
import {
  persistSnapshotAndSyncState,
} from "@/lib/b2b/employee-sync-snapshot";
export {
  logB2bAdminAction,
  logB2bEmployeeAccess,
} from "@/lib/b2b/employee-service.logs";

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

const HYPHEN_TIMEOUT_CODES = new Set(["HYPHEN_TIMEOUT", "HYF-0002", "HYF-9999"]);
const HYPHEN_TIMEOUT_MESSAGE_PATTERN =
  /(timeout|timed out|시간\s*초과|응답\s*지연|지연되고\s*있습니다)/i;

function isHyphenTimeoutFailure(input: {
  errCd?: string | null;
  errMsg?: string | null;
  payloadError?: string | null;
}) {
  const errCd = (input.errCd || "").trim().toUpperCase();
  if (errCd && HYPHEN_TIMEOUT_CODES.has(errCd)) return true;
  const message = [input.errMsg, input.payloadError]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  if (!message) return false;
  return HYPHEN_TIMEOUT_MESSAGE_PATTERN.test(message);
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

  const matchedEmployee = await mergeDuplicateB2bEmployeesForIdentity({
    appUserId: input.appUserId,
    identityHash: identity.identityHash,
    name: identity.name,
    birthDate: identity.birthDate,
    phoneNormalized: identity.phoneNormalized,
  });

  const employee = matchedEmployee
    ? await reconcileMatchedB2bEmployeeIdentity({
        employeeId: matchedEmployee.id,
        nextIdentity: {
          appUserId: input.appUserId,
          identityHash: identity.identityHash,
          name: identity.name,
          birthDate: identity.birthDate,
          phoneNormalized: identity.phoneNormalized,
        },
      })
    : await db.b2bEmployee.create({
        data: {
          appUserId: input.appUserId,
          name: identity.name,
          birthDate: identity.birthDate,
          phoneNormalized: identity.phoneNormalized,
          identityHash: identity.identityHash,
          linkedProvider: HYPHEN_PROVIDER,
        },
      });

  if (!employee) {
    throw new Error("B2B employee identity reconciliation failed");
  }

  return {
    employee,
    identity: {
      name: employee.name,
      birthDate: employee.birthDate,
      phoneNormalized: employee.phoneNormalized,
      identityHash: employee.identityHash,
    },
  };
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
      message:
        "연동 초기화가 필요합니다. 카카오톡 인증 요청을 먼저 진행해 주세요.",
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
      identity: {
        name: input.identity.name,
        birthDate: input.identity.birthDate,
        phoneNormalized: input.identity.phoneNormalized,
      },
      effectiveYearLimit,
      requestDefaults,
      linkLoginMethod: link.loginMethod,
      linkLoginOrgCd: link.loginOrgCd,
      linkCookieData: link.cookieData,
    };

    if (input.forceRefresh) {
      clearNhisFetchMemoryCacheForUser(input.appUserId);
      await clearNhisFetchCaches(input.appUserId).catch((error) => {
        console.error("[b2b][employee-sync] failed to clear NHIS cache before force refresh", {
          appUserId: input.appUserId,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }

    if (!input.forceRefresh) {
      const reused = await resolveEmployeeSyncReusableSnapshot({
        employeeId: input.employeeId,
        appUserId: input.appUserId,
        identityHash: identity.identityHash,
        requestHash: requestHashMeta.requestHash,
        targets,
        effectiveYearLimit,
        subjectType: requestDefaults.subjectType,
        summaryPatchContext,
      });
      if (reused) {
        return reused;
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
      identity: {
        name: input.identity.name,
        birthDate: input.identity.birthDate,
        phoneNormalized: input.identity.phoneNormalized,
      },
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
          message:
            "인증 세션이 만료되었습니다. 카카오톡 인증을 다시 진행해 주세요.",
          code: "NHIS_AUTH_EXPIRED",
          reason: "nhis_auth_expired",
          status: 409,
          nextAction: "init",
        });
      }
      if (
        isHyphenTimeoutFailure({
          errCd,
          errMsg: executed.firstFailed?.errMsg,
          payloadError: executed.payload.error,
        })
      ) {
        throw new B2bEmployeeSyncError({
          message:
            "외부 건강데이터 연동 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
          code: "HYPHEN_FETCH_TIMEOUT",
          reason: "hyphen_fetch_timeout",
          status: 504,
          nextAction: "retry",
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
