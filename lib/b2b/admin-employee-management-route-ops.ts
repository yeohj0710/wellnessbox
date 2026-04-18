import "server-only";

import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import {
  type AdminEmployeeRecordType,
} from "@/lib/b2b/admin-employee-management-contract";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { noStoreJson } from "@/lib/server/no-store";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { clearNhisFetchMemoryCacheForUser } from "@/lib/server/hyphen/fetch-memory-cache";
import { clearNhisLink } from "@/lib/server/hyphen/link";

export const APP_USER_REQUIRED_ERROR =
  "이 직원은 appUserId가 없어 하이픈 캐시/연동 정보를 정리할 수 없습니다.";
export const RECORD_NOT_FOUND_ERROR = "삭제할 레코드를 찾을 수 없습니다.";

async function clearEmployeeScopedHyphenArtifactsInTx(input: {
  tx: Prisma.TransactionClient;
  appUserId: string | null;
  identityHash: string;
}) {
  if (!input.appUserId) {
    return {
      healthFetchCaches: 0,
      healthFetchAttempts: 0,
    };
  }

  const provider = HYPHEN_PROVIDER;
  const [cacheDeleteResult, attemptDeleteResult] = await Promise.all([
    input.tx.healthProviderFetchCache.deleteMany({
      where: {
        appUserId: input.appUserId,
        provider,
        identityHash: input.identityHash,
      },
    }),
    input.tx.healthProviderFetchAttempt.deleteMany({
      where: {
        appUserId: input.appUserId,
        provider,
        identityHash: input.identityHash,
      },
    }),
  ]);

  return {
    healthFetchCaches: cacheDeleteResult.count,
    healthFetchAttempts: attemptDeleteResult.count,
  };
}

export async function resetAllB2bDataForEmployee(input: {
  employeeId: string;
  appUserId: string | null;
  identityHash: string;
  includeAccessLogs: boolean;
  includeAdminLogs: boolean;
}) {
  const deleted = await db.$transaction(async (tx) => {
    const hyphenDeleted = await clearEmployeeScopedHyphenArtifactsInTx({
      tx,
      appUserId: input.appUserId,
      identityHash: input.identityHash,
    });

    const deleted = {
      healthSnapshots: (
        await tx.b2bHealthDataSnapshot.deleteMany({
          where: { employeeId: input.employeeId },
        })
      ).count,
      surveyResponses: (
        await tx.b2bSurveyResponse.deleteMany({
          where: { employeeId: input.employeeId },
        })
      ).count,
      analysisResults: (
        await tx.b2bAnalysisResult.deleteMany({
          where: { employeeId: input.employeeId },
        })
      ).count,
      pharmacistNotes: (
        await tx.b2bPharmacistNote.deleteMany({
          where: { employeeId: input.employeeId },
        })
      ).count,
      reports: (
        await tx.b2bReport.deleteMany({
          where: { employeeId: input.employeeId },
        })
      ).count,
      accessLogs: input.includeAccessLogs
        ? (
            await tx.b2bEmployeeAccessLog.deleteMany({
              where: { employeeId: input.employeeId },
            })
          ).count
        : 0,
      adminActionLogs: input.includeAdminLogs
        ? (
            await tx.b2bAdminActionLog.deleteMany({
              where: { employeeId: input.employeeId },
            })
          ).count
        : 0,
      syncState: (
        await tx.b2bEmployeeSyncState.deleteMany({
          where: { employeeId: input.employeeId },
        })
      ).count,
      ...hyphenDeleted,
    };

    await tx.b2bEmployee.update({
      where: { id: input.employeeId },
      data: {
        lastSyncedAt: null,
        lastViewedAt: null,
      },
    });

    await tx.b2bAdminActionLog.create({
      data: {
        employeeId: input.employeeId,
        action: "employee_reset_all_b2b_data",
        actorTag: "admin",
        payload: deleted,
      },
    });

    return deleted;
  });

  if (input.appUserId) {
    clearNhisFetchMemoryCacheForUser(input.appUserId);
  }

  return deleted;
}

export async function resetPeriodDataForEmployee(input: {
  employeeId: string;
  periodKey: string;
}) {
  return db.$transaction(async (tx) => {
    const deleted = {
      healthSnapshots: (
        await tx.b2bHealthDataSnapshot.deleteMany({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
        })
      ).count,
      surveyResponses: (
        await tx.b2bSurveyResponse.deleteMany({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
        })
      ).count,
      analysisResults: (
        await tx.b2bAnalysisResult.deleteMany({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
        })
      ).count,
      pharmacistNotes: (
        await tx.b2bPharmacistNote.deleteMany({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
        })
      ).count,
      reports: (
        await tx.b2bReport.deleteMany({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
        })
      ).count,
    };

    const remainingSnapshots = await tx.b2bHealthDataSnapshot.count({
      where: { employeeId: input.employeeId },
    });
    if (remainingSnapshots === 0) {
      await tx.b2bEmployee.update({
        where: { id: input.employeeId },
        data: { lastSyncedAt: null },
      });
    }

    await tx.b2bAdminActionLog.create({
      data: {
        employeeId: input.employeeId,
        action: "employee_reset_period_data",
        actorTag: "admin",
        payload: {
          periodKey: input.periodKey,
          deleted,
        },
      },
    });

    return deleted;
  });
}

export async function clearHyphenCachesForEmployee(input: {
  employeeId: string;
  appUserId: string;
  clearLink: boolean;
  clearFetchCache: boolean;
  clearFetchAttempts: boolean;
}) {
  const provider = HYPHEN_PROVIDER;

  const [cacheDeleteResult, attemptDeleteResult] = await Promise.all([
    input.clearFetchCache
      ? db.healthProviderFetchCache.deleteMany({
          where: { appUserId: input.appUserId, provider },
        })
      : Promise.resolve({ count: 0 }),
    input.clearFetchAttempts
      ? db.healthProviderFetchAttempt.deleteMany({
          where: { appUserId: input.appUserId, provider },
        })
      : Promise.resolve({ count: 0 }),
  ]);

  if (input.clearLink) {
    await clearNhisLink(input.appUserId);
  } else if (input.clearFetchCache) {
    clearNhisFetchMemoryCacheForUser(input.appUserId);
  }

  const payload = {
    appUserId: input.appUserId,
    provider,
    clearLink: input.clearLink,
    clearFetchCache: input.clearFetchCache,
    clearFetchAttempts: input.clearFetchAttempts,
    deleted: {
      healthFetchCaches: cacheDeleteResult.count,
      healthFetchAttempts: attemptDeleteResult.count,
    },
  };

  await logB2bAdminAction({
    employeeId: input.employeeId,
    action: "employee_clear_hyphen_cache",
    actorTag: "admin",
    payload,
  });

  return payload;
}

export async function deleteEmployeeRecord(input: {
  employeeId: string;
  appUserId: string | null;
  recordType: AdminEmployeeRecordType;
  recordId: string;
}) {
  const provider = HYPHEN_PROVIDER;
  let deletedCount = 0;

  if (input.recordType === "healthSnapshot") {
    const result = await db.b2bHealthDataSnapshot.deleteMany({
      where: { id: input.recordId, employeeId: input.employeeId },
    });
    deletedCount = result.count;
    if (deletedCount > 0) {
      const remaining = await db.b2bHealthDataSnapshot.count({
        where: { employeeId: input.employeeId },
      });
      if (remaining === 0) {
        await db.b2bEmployee.update({
          where: { id: input.employeeId },
          data: { lastSyncedAt: null },
        });
      }
    }
  } else if (input.recordType === "surveyResponse") {
    deletedCount = (
      await db.b2bSurveyResponse.deleteMany({
        where: { id: input.recordId, employeeId: input.employeeId },
      })
    ).count;
  } else if (input.recordType === "analysisResult") {
    deletedCount = (
      await db.b2bAnalysisResult.deleteMany({
        where: { id: input.recordId, employeeId: input.employeeId },
      })
    ).count;
  } else if (input.recordType === "pharmacistNote") {
    deletedCount = (
      await db.b2bPharmacistNote.deleteMany({
        where: { id: input.recordId, employeeId: input.employeeId },
      })
    ).count;
  } else if (input.recordType === "report") {
    deletedCount = (
      await db.b2bReport.deleteMany({
        where: { id: input.recordId, employeeId: input.employeeId },
      })
    ).count;
  } else if (input.recordType === "accessLog") {
    deletedCount = (
      await db.b2bEmployeeAccessLog.deleteMany({
        where: { id: input.recordId, employeeId: input.employeeId },
      })
    ).count;
  } else if (input.recordType === "adminActionLog") {
    deletedCount = (
      await db.b2bAdminActionLog.deleteMany({
        where: { id: input.recordId, employeeId: input.employeeId },
      })
    ).count;
  } else if (input.recordType === "healthFetchCache") {
    if (!input.appUserId) {
      return noStoreJson({ ok: false, error: APP_USER_REQUIRED_ERROR }, 400);
    }
    deletedCount = (
      await db.healthProviderFetchCache.deleteMany({
        where: {
          id: input.recordId,
          appUserId: input.appUserId,
          provider,
        },
      })
    ).count;
    if (deletedCount > 0) {
      clearNhisFetchMemoryCacheForUser(input.appUserId);
    }
  } else if (input.recordType === "healthFetchAttempt") {
    if (!input.appUserId) {
      return noStoreJson({ ok: false, error: APP_USER_REQUIRED_ERROR }, 400);
    }
    deletedCount = (
      await db.healthProviderFetchAttempt.deleteMany({
        where: {
          id: input.recordId,
          appUserId: input.appUserId,
          provider,
        },
      })
    ).count;
  }

  if (deletedCount < 1) {
    return noStoreJson({ ok: false, error: RECORD_NOT_FOUND_ERROR }, 404);
  }

  await logB2bAdminAction({
    employeeId: input.employeeId,
    action: "employee_delete_record",
    actorTag: "admin",
    payload: {
      recordType: input.recordType,
      recordId: input.recordId,
    },
  });

  return noStoreJson({
    ok: true,
    action: "delete_record",
    deleted: {
      recordType: input.recordType,
      recordId: input.recordId,
      count: deletedCount,
    },
  });
}

export async function deleteEmployeeWithAudit(target: {
  id: string;
  name: string;
  appUserId: string | null;
  identityHash: string;
  counts: {
    healthSnapshots: number;
    surveyResponses: number;
    analysisResults: number;
    pharmacistNotes: number;
    reports: number;
    accessLogs: number;
    adminActionLogs: number;
  };
}) {
  await db.$transaction(async (tx) => {
    const hyphenDeleted = await clearEmployeeScopedHyphenArtifactsInTx({
      tx,
      appUserId: target.appUserId,
      identityHash: target.identityHash,
    });

    await tx.b2bAdminActionLog.create({
      data: {
        employeeId: target.id,
        action: "employee_delete",
        actorTag: "admin",
        payload: {
          employeeId: target.id,
          employeeName: target.name,
          appUserId: target.appUserId,
          counts: target.counts,
          deleted: hyphenDeleted,
        },
      },
    });
    await tx.b2bEmployee.delete({
      where: { id: target.id },
    });
  });

  if (target.appUserId) {
    clearNhisFetchMemoryCacheForUser(target.appUserId);
  }
}
