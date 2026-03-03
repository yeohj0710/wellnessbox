import "server-only";

import { z } from "zod";
import db from "@/lib/db";
import {
  requireAdminExistingEmployeeId,
  type B2bEmployeeRouteContext,
} from "@/lib/b2b/admin-employee-route";
import { resolveB2bEmployeeIdentity } from "@/lib/b2b/identity";
import { b2bEmployeeIdentityInputSchema } from "@/lib/b2b/employee-route-schema";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";
import {
  buildValidationErrorResponse,
  parseRouteBodyWithSchema,
} from "@/lib/b2b/route-helpers";
import { noStoreJson } from "@/lib/server/no-store";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";
import { clearNhisFetchMemoryCacheForUser } from "@/lib/server/hyphen/fetch-memory-cache";
import { clearNhisLink } from "@/lib/server/hyphen/link";
import { requireAdminSession } from "@/lib/server/route-auth";

const EMPLOYEE_NOT_FOUND_ERROR = "직원 정보를 찾을 수 없습니다.";
const INPUT_INVALID_ERROR = "입력 형식을 확인해 주세요.";
const APP_USER_NOT_FOUND_ERROR = "연결할 사용자(AppUser)를 찾을 수 없습니다.";
const EMPLOYEE_DUPLICATE_ERROR =
  "동일한 이름/생년월일/휴대폰 조합의 직원이 이미 존재합니다.";
const EMPLOYEE_DELETE_CONFIRM_ERROR =
  "직원 삭제 확인 문구가 일치하지 않습니다. 직원명을 정확히 입력해 주세요.";
const PERIOD_INVALID_ERROR = "기간은 YYYY-MM 형식으로 입력해 주세요.";
const APP_USER_REQUIRED_ERROR =
  "이 직원은 appUserId가 없어 하이픈 캐시/연동 정보를 정리할 수 없습니다.";
const RECORD_NOT_FOUND_ERROR = "삭제할 레코드를 찾을 수 없습니다.";

const RECENT_RECORD_TAKE = 30;
const RECENT_LOG_TAKE = 40;

const nullableAppUserIdSchema = z
  .union([z.string().trim().min(1).max(80), z.literal(""), z.null()])
  .optional();

const providerSchema = z.string().trim().min(1).max(80);

const createEmployeeSchema = b2bEmployeeIdentityInputSchema.extend({
  appUserId: nullableAppUserIdSchema,
  linkedProvider: providerSchema.optional(),
});

const patchEmployeeSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    birthDate: z.string().trim().regex(/^\d{8}$/).optional(),
    phone: z.string().trim().regex(/^\d{10,11}$/).optional(),
    appUserId: nullableAppUserIdSchema,
    linkedProvider: providerSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.birthDate !== undefined ||
      value.phone !== undefined ||
      value.appUserId !== undefined ||
      value.linkedProvider !== undefined,
    {
      message: "수정할 항목이 없습니다.",
    }
  );

const deleteEmployeeSchema = z.object({
  confirmName: z.string().trim().min(1).max(60),
});

const recordTypeSchema = z.enum([
  "healthSnapshot",
  "surveyResponse",
  "analysisResult",
  "pharmacistNote",
  "report",
  "accessLog",
  "adminActionLog",
  "healthFetchCache",
  "healthFetchAttempt",
]);

const employeeOpsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reset_all_b2b_data"),
    includeAccessLogs: z.boolean().optional(),
    includeAdminLogs: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("reset_period_data"),
    periodKey: z
      .string()
      .trim()
      .regex(B2B_PERIOD_KEY_REGEX, PERIOD_INVALID_ERROR),
  }),
  z.object({
    action: z.literal("clear_hyphen_cache"),
    clearLink: z.boolean().optional(),
    clearFetchCache: z.boolean().optional(),
    clearFetchAttempts: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("delete_record"),
    recordType: recordTypeSchema,
    recordId: z.string().trim().min(1),
  }),
]);

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizeNullableText(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureAppUserExists(appUserId: string) {
  const user = await db.appUser.findUnique({
    where: { id: appUserId },
    select: { id: true },
  });
  return Boolean(user);
}

function mergePeriods(...groups: Array<Array<string | null> | undefined>) {
  const set = new Set<string>();
  for (const group of groups) {
    if (!group) continue;
    for (const period of group) {
      if (typeof period !== "string") continue;
      if (!B2B_PERIOD_KEY_REGEX.test(period)) continue;
      set.add(period);
    }
  }
  return [...set].sort((left, right) => right.localeCompare(left));
}

function summarizeJsonShape(value: unknown) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    return {
      kind: "array",
      size: value.length,
    } as const;
  }

  const keys = Object.keys(value as Record<string, unknown>).slice(0, 12);
  return {
    kind: "object",
    keys,
    keyCount: Object.keys(value as Record<string, unknown>).length,
  } as const;
}

function serializeEmployeeRow(employee: {
  id: string;
  appUserId: string | null;
  name: string;
  birthDate: string;
  phoneNormalized: string;
  identityHash: string;
  linkedProvider: string;
  lastSyncedAt: Date | null;
  lastViewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: employee.id,
    appUserId: employee.appUserId,
    name: employee.name,
    birthDate: employee.birthDate,
    phoneNormalized: employee.phoneNormalized,
    identityHash: employee.identityHash,
    linkedProvider: employee.linkedProvider,
    lastSyncedAt: toIso(employee.lastSyncedAt),
    lastViewedAt: toIso(employee.lastViewedAt),
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

async function loadEmployeeForOps(employeeId: string) {
  const employee = await db.b2bEmployee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      appUserId: true,
      name: true,
      birthDate: true,
      phoneNormalized: true,
      identityHash: true,
      linkedProvider: true,
      lastSyncedAt: true,
      lastViewedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          healthSnapshots: true,
          surveyResponses: true,
          analysisResults: true,
          pharmacistNotes: true,
          reports: true,
          accessLogs: true,
          adminActionLogs: true,
        },
      },
    },
  });

  if (!employee) {
    return noStoreJson({ ok: false, error: EMPLOYEE_NOT_FOUND_ERROR }, 404);
  }

  const appUserId = employee.appUserId;
  const provider = employee.linkedProvider || HYPHEN_PROVIDER;

  const [
    healthSnapshots,
    surveyResponses,
    analysisResults,
    pharmacistNotes,
    reports,
    accessLogs,
    adminActionLogs,
    link,
    cacheCountTotal,
    cacheCountValid,
    fetchCaches,
    fetchAttempts,
  ] = await Promise.all([
    db.b2bHealthDataSnapshot.findMany({
      where: { employeeId },
      orderBy: [{ fetchedAt: "desc" }, { createdAt: "desc" }],
      take: RECENT_RECORD_TAKE,
      select: {
        id: true,
        provider: true,
        sourceMode: true,
        periodKey: true,
        reportCycle: true,
        fetchedAt: true,
        createdAt: true,
        normalizedJson: true,
        rawJson: true,
      },
    }),
    db.b2bSurveyResponse.findMany({
      where: { employeeId },
      orderBy: [{ periodKey: "desc" }, { updatedAt: "desc" }],
      take: RECENT_RECORD_TAKE,
      include: {
        answers: {
          orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }],
          take: 20,
          select: {
            id: true,
            questionKey: true,
            sectionKey: true,
            answerText: true,
            answerValue: true,
            score: true,
            meta: true,
          },
        },
      },
    }),
    db.b2bAnalysisResult.findMany({
      where: { employeeId },
      orderBy: [{ periodKey: "desc" }, { version: "desc" }, { updatedAt: "desc" }],
      take: RECENT_RECORD_TAKE,
      select: {
        id: true,
        version: true,
        periodKey: true,
        reportCycle: true,
        computedAt: true,
        createdAt: true,
        updatedAt: true,
        payload: true,
      },
    }),
    db.b2bPharmacistNote.findMany({
      where: { employeeId },
      orderBy: [{ periodKey: "desc" }, { updatedAt: "desc" }],
      take: RECENT_RECORD_TAKE,
      select: {
        id: true,
        periodKey: true,
        reportCycle: true,
        note: true,
        recommendations: true,
        cautions: true,
        createdByAdminTag: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.b2bReport.findMany({
      where: { employeeId },
      orderBy: [{ periodKey: "desc" }, { variantIndex: "desc" }, { updatedAt: "desc" }],
      take: RECENT_RECORD_TAKE,
      select: {
        id: true,
        variantIndex: true,
        status: true,
        pageSize: true,
        stylePreset: true,
        periodKey: true,
        reportCycle: true,
        createdAt: true,
        updatedAt: true,
        reportPayload: true,
        layoutDsl: true,
        exportAudit: true,
      },
    }),
    db.b2bEmployeeAccessLog.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
      take: RECENT_LOG_TAKE,
      select: {
        id: true,
        action: true,
        route: true,
        userAgent: true,
        payload: true,
        createdAt: true,
      },
    }),
    db.b2bAdminActionLog.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
      take: RECENT_LOG_TAKE,
      select: {
        id: true,
        action: true,
        actorTag: true,
        payload: true,
        createdAt: true,
      },
    }),
    appUserId
      ? db.healthProviderLink.findUnique({
          where: {
            appUserId_provider: {
              appUserId,
              provider,
            },
          },
          select: {
            provider: true,
            linked: true,
            loginMethod: true,
            loginOrgCd: true,
            stepMode: true,
            lastLinkedAt: true,
            lastFetchedAt: true,
            lastErrorCode: true,
            lastErrorMessage: true,
            updatedAt: true,
            cookieData: true,
            stepData: true,
          },
        })
      : Promise.resolve(null),
    appUserId
      ? db.healthProviderFetchCache.count({
          where: { appUserId, provider },
        })
      : Promise.resolve(0),
    appUserId
      ? db.healthProviderFetchCache.count({
          where: {
            appUserId,
            provider,
            expiresAt: { gt: new Date() },
          },
        })
      : Promise.resolve(0),
    appUserId
      ? db.healthProviderFetchCache.findMany({
          where: { appUserId, provider },
          orderBy: { fetchedAt: "desc" },
          take: RECENT_RECORD_TAKE,
          select: {
            id: true,
            requestHash: true,
            requestKey: true,
            targets: true,
            yearLimit: true,
            subjectType: true,
            statusCode: true,
            ok: true,
            partial: true,
            fetchedAt: true,
            expiresAt: true,
            hitCount: true,
            lastHitAt: true,
          },
        })
      : Promise.resolve([]),
    appUserId
      ? db.healthProviderFetchAttempt.findMany({
          where: { appUserId, provider },
          orderBy: { createdAt: "desc" },
          take: RECENT_LOG_TAKE,
          select: {
            id: true,
            requestHash: true,
            requestKey: true,
            identityHash: true,
            forceRefresh: true,
            cached: true,
            statusCode: true,
            ok: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const periods = mergePeriods(
    healthSnapshots.map((row) => row.periodKey),
    surveyResponses.map((row) => row.periodKey),
    analysisResults.map((row) => row.periodKey),
    pharmacistNotes.map((row) => row.periodKey),
    reports.map((row) => row.periodKey)
  );

  return noStoreJson({
    ok: true,
    employee: serializeEmployeeRow(employee),
    summary: {
      periods,
      counts: {
        healthSnapshots: employee._count.healthSnapshots,
        surveyResponses: employee._count.surveyResponses,
        analysisResults: employee._count.analysisResults,
        pharmacistNotes: employee._count.pharmacistNotes,
        reports: employee._count.reports,
        accessLogs: employee._count.accessLogs,
        adminActionLogs: employee._count.adminActionLogs,
        healthFetchCaches: cacheCountTotal,
        healthFetchCachesValid: cacheCountValid,
        healthFetchAttempts: fetchAttempts.length,
      },
    },
    records: {
      healthSnapshots: healthSnapshots.map((snapshot) => ({
        id: snapshot.id,
        provider: snapshot.provider,
        sourceMode: snapshot.sourceMode,
        periodKey: snapshot.periodKey,
        reportCycle: snapshot.reportCycle,
        fetchedAt: snapshot.fetchedAt.toISOString(),
        createdAt: snapshot.createdAt.toISOString(),
        normalizedShape: summarizeJsonShape(snapshot.normalizedJson),
        rawShape: summarizeJsonShape(snapshot.rawJson),
        normalizedJson: snapshot.normalizedJson,
        rawJson: snapshot.rawJson,
      })),
      surveyResponses: surveyResponses.map((survey) => ({
        id: survey.id,
        templateId: survey.templateId,
        templateVersion: survey.templateVersion,
        periodKey: survey.periodKey,
        reportCycle: survey.reportCycle,
        selectedSections: survey.selectedSections,
        answersJson: survey.answersJson,
        submittedAt: toIso(survey.submittedAt),
        createdAt: survey.createdAt.toISOString(),
        updatedAt: survey.updatedAt.toISOString(),
        answers: survey.answers.map((answer) => ({
          id: answer.id,
          questionKey: answer.questionKey,
          sectionKey: answer.sectionKey,
          answerText: answer.answerText,
          answerValue: answer.answerValue,
          score: answer.score,
          meta: answer.meta,
        })),
      })),
      analysisResults: analysisResults.map((analysis) => ({
        id: analysis.id,
        version: analysis.version,
        periodKey: analysis.periodKey,
        reportCycle: analysis.reportCycle,
        payload: analysis.payload,
        computedAt: toIso(analysis.computedAt),
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: analysis.updatedAt.toISOString(),
      })),
      pharmacistNotes: pharmacistNotes.map((note) => ({
        id: note.id,
        periodKey: note.periodKey,
        reportCycle: note.reportCycle,
        note: note.note,
        recommendations: note.recommendations,
        cautions: note.cautions,
        createdByAdminTag: note.createdByAdminTag,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      })),
      reports: reports.map((report) => ({
        id: report.id,
        variantIndex: report.variantIndex,
        status: report.status,
        pageSize: report.pageSize,
        stylePreset: report.stylePreset,
        periodKey: report.periodKey,
        reportCycle: report.reportCycle,
        reportPayload: report.reportPayload,
        layoutDsl: report.layoutDsl,
        exportAudit: report.exportAudit,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      })),
      accessLogs: accessLogs.map((log) => ({
        id: log.id,
        action: log.action,
        route: log.route,
        userAgent: log.userAgent,
        payload: log.payload,
        createdAt: log.createdAt.toISOString(),
      })),
      adminActionLogs: adminActionLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorTag: log.actorTag,
        payload: log.payload,
        createdAt: log.createdAt.toISOString(),
      })),
    },
    healthLink: appUserId
      ? {
          provider,
          appUserId,
          link: link
            ? {
                provider: link.provider,
                linked: link.linked,
                loginMethod: link.loginMethod,
                loginOrgCd: link.loginOrgCd,
                stepMode: link.stepMode,
                lastLinkedAt: toIso(link.lastLinkedAt),
                lastFetchedAt: toIso(link.lastFetchedAt),
                lastErrorCode: link.lastErrorCode,
                lastErrorMessage: link.lastErrorMessage,
                hasStepData: Boolean(link.stepData),
                hasCookieData: Boolean(link.cookieData),
                updatedAt: link.updatedAt.toISOString(),
              }
            : null,
          cacheSummary: {
            totalEntries: cacheCountTotal,
            validEntries: cacheCountValid,
          },
          fetchCaches: fetchCaches.map((cache) => ({
            id: cache.id,
            requestHash: cache.requestHash,
            requestKey: cache.requestKey,
            targets: cache.targets,
            yearLimit: cache.yearLimit,
            subjectType: cache.subjectType,
            statusCode: cache.statusCode,
            ok: cache.ok,
            partial: cache.partial,
            fetchedAt: cache.fetchedAt.toISOString(),
            expiresAt: cache.expiresAt.toISOString(),
            hitCount: cache.hitCount,
            lastHitAt: toIso(cache.lastHitAt),
          })),
          fetchAttempts: fetchAttempts.map((attempt) => ({
            id: attempt.id,
            requestHash: attempt.requestHash,
            requestKey: attempt.requestKey,
            identityHash: attempt.identityHash,
            forceRefresh: attempt.forceRefresh,
            cached: attempt.cached,
            statusCode: attempt.statusCode,
            ok: attempt.ok,
            createdAt: attempt.createdAt.toISOString(),
          })),
        }
      : null,
  });
}

async function resetAllB2bDataForEmployee(input: {
  employeeId: string;
  includeAccessLogs: boolean;
  includeAdminLogs: boolean;
}) {
  return db.$transaction(async (tx) => {
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
}

async function resetPeriodDataForEmployee(input: {
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

async function clearHyphenCachesForEmployee(input: {
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

async function deleteEmployeeRecord(input: {
  employeeId: string;
  appUserId: string | null;
  recordType: z.infer<typeof recordTypeSchema>;
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

export async function runAdminEmployeeOpsGetRoute(
  _req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;
  return loadEmployeeForOps(authEmployee.employeeId);
}

export async function runAdminEmployeeCreatePostRoute(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const parsed = await parseRouteBodyWithSchema(req, createEmployeeSchema, null);
  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error, INPUT_INVALID_ERROR);
  }

  const appUserId = normalizeNullableText(parsed.data.appUserId);
  if (appUserId) {
    const exists = await ensureAppUserExists(appUserId);
    if (!exists) {
      return noStoreJson({ ok: false, error: APP_USER_NOT_FOUND_ERROR }, 400);
    }
  }

  const identity = resolveB2bEmployeeIdentity({
    name: parsed.data.name,
    birthDate: parsed.data.birthDate,
    phone: parsed.data.phone,
  });
  const duplicate = await db.b2bEmployee.findUnique({
    where: { identityHash: identity.identityHash },
    select: { id: true, name: true, birthDate: true, phoneNormalized: true },
  });
  if (duplicate) {
    return noStoreJson(
      {
        ok: false,
        error: EMPLOYEE_DUPLICATE_ERROR,
        duplicate,
      },
      409
    );
  }

  const employee = await db.b2bEmployee.create({
    data: {
      appUserId,
      name: identity.name,
      birthDate: identity.birthDate,
      phoneNormalized: identity.phoneNormalized,
      identityHash: identity.identityHash,
      linkedProvider:
        normalizeNullableText(parsed.data.linkedProvider) || HYPHEN_PROVIDER,
    },
    select: {
      id: true,
      appUserId: true,
      name: true,
      birthDate: true,
      phoneNormalized: true,
      identityHash: true,
      linkedProvider: true,
      lastSyncedAt: true,
      lastViewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await logB2bAdminAction({
    employeeId: employee.id,
    action: "employee_create",
    actorTag: "admin",
    payload: {
      appUserId,
      linkedProvider: employee.linkedProvider,
    },
  });

  return noStoreJson({
    ok: true,
    employee: serializeEmployeeRow(employee),
  });
}

export async function runAdminEmployeePatchRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const parsed = await parseRouteBodyWithSchema(req, patchEmployeeSchema, null);
  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error, INPUT_INVALID_ERROR);
  }

  const current = await db.b2bEmployee.findUnique({
    where: { id: authEmployee.employeeId },
    select: {
      id: true,
      appUserId: true,
      name: true,
      birthDate: true,
      phoneNormalized: true,
      identityHash: true,
      linkedProvider: true,
      lastSyncedAt: true,
      lastViewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!current) {
    return noStoreJson({ ok: false, error: EMPLOYEE_NOT_FOUND_ERROR }, 404);
  }

  const updateData: {
    appUserId?: string | null;
    name?: string;
    birthDate?: string;
    phoneNormalized?: string;
    identityHash?: string;
    linkedProvider?: string;
  } = {};
  const changedFields: string[] = [];

  if (
    parsed.data.name !== undefined ||
    parsed.data.birthDate !== undefined ||
    parsed.data.phone !== undefined
  ) {
    const nextIdentity = resolveB2bEmployeeIdentity({
      name: parsed.data.name ?? current.name,
      birthDate: parsed.data.birthDate ?? current.birthDate,
      phone: parsed.data.phone ?? current.phoneNormalized,
    });

    if (nextIdentity.identityHash !== current.identityHash) {
      const duplicate = await db.b2bEmployee.findUnique({
        where: { identityHash: nextIdentity.identityHash },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== current.id) {
        return noStoreJson({ ok: false, error: EMPLOYEE_DUPLICATE_ERROR }, 409);
      }
    }

    updateData.name = nextIdentity.name;
    updateData.birthDate = nextIdentity.birthDate;
    updateData.phoneNormalized = nextIdentity.phoneNormalized;
    updateData.identityHash = nextIdentity.identityHash;
    changedFields.push("name", "birthDate", "phoneNormalized", "identityHash");
  }

  if (parsed.data.appUserId !== undefined) {
    const nextAppUserId = normalizeNullableText(parsed.data.appUserId);
    if (nextAppUserId) {
      const exists = await ensureAppUserExists(nextAppUserId);
      if (!exists) {
        return noStoreJson({ ok: false, error: APP_USER_NOT_FOUND_ERROR }, 400);
      }
    }
    updateData.appUserId = nextAppUserId;
    changedFields.push("appUserId");
  }

  if (parsed.data.linkedProvider !== undefined) {
    updateData.linkedProvider = parsed.data.linkedProvider.trim();
    changedFields.push("linkedProvider");
  }

  if (Object.keys(updateData).length === 0) {
    return noStoreJson({ ok: false, error: "수정할 내용이 없습니다." }, 400);
  }

  const updated = await db.b2bEmployee.update({
    where: { id: current.id },
    data: updateData,
    select: {
      id: true,
      appUserId: true,
      name: true,
      birthDate: true,
      phoneNormalized: true,
      identityHash: true,
      linkedProvider: true,
      lastSyncedAt: true,
      lastViewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await logB2bAdminAction({
    employeeId: updated.id,
    action: "employee_patch",
    actorTag: "admin",
    payload: {
      changedFields: [...new Set(changedFields)],
    },
  });

  return noStoreJson({
    ok: true,
    employee: serializeEmployeeRow(updated),
  });
}

export async function runAdminEmployeeDeleteRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const parsed = await parseRouteBodyWithSchema(req, deleteEmployeeSchema, null);
  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error, INPUT_INVALID_ERROR);
  }

  const target = await db.b2bEmployee.findUnique({
    where: { id: authEmployee.employeeId },
    select: {
      id: true,
      name: true,
      appUserId: true,
      _count: {
        select: {
          healthSnapshots: true,
          surveyResponses: true,
          analysisResults: true,
          pharmacistNotes: true,
          reports: true,
          accessLogs: true,
          adminActionLogs: true,
        },
      },
    },
  });
  if (!target) {
    return noStoreJson({ ok: false, error: EMPLOYEE_NOT_FOUND_ERROR }, 404);
  }

  if (parsed.data.confirmName.trim() !== target.name) {
    return noStoreJson({ ok: false, error: EMPLOYEE_DELETE_CONFIRM_ERROR }, 400);
  }

  await db.$transaction(async (tx) => {
    await tx.b2bAdminActionLog.create({
      data: {
        employeeId: target.id,
        action: "employee_delete",
        actorTag: "admin",
        payload: {
          employeeId: target.id,
          employeeName: target.name,
          appUserId: target.appUserId,
          counts: target._count,
        },
      },
    });
    await tx.b2bEmployee.delete({
      where: { id: target.id },
    });
  });

  return noStoreJson({
    ok: true,
    deleted: {
      employeeId: target.id,
      employeeName: target.name,
    },
  });
}

export async function runAdminEmployeeOpsPostRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const parsed = await parseRouteBodyWithSchema(req, employeeOpsSchema, null);
  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error, INPUT_INVALID_ERROR);
  }

  const employee = await db.b2bEmployee.findUnique({
    where: { id: authEmployee.employeeId },
    select: {
      id: true,
      name: true,
      appUserId: true,
    },
  });
  if (!employee) {
    return noStoreJson({ ok: false, error: EMPLOYEE_NOT_FOUND_ERROR }, 404);
  }

  if (parsed.data.action === "reset_all_b2b_data") {
    const deleted = await resetAllB2bDataForEmployee({
      employeeId: employee.id,
      includeAccessLogs: parsed.data.includeAccessLogs === true,
      includeAdminLogs: parsed.data.includeAdminLogs === true,
    });
    return noStoreJson({
      ok: true,
      action: parsed.data.action,
      deleted,
    });
  }

  if (parsed.data.action === "reset_period_data") {
    const periodKey = parsed.data.periodKey.trim();
    if (!B2B_PERIOD_KEY_REGEX.test(periodKey)) {
      return noStoreJson({ ok: false, error: PERIOD_INVALID_ERROR }, 400);
    }
    const deleted = await resetPeriodDataForEmployee({
      employeeId: employee.id,
      periodKey,
    });
    return noStoreJson({
      ok: true,
      action: parsed.data.action,
      periodKey,
      deleted,
    });
  }

  if (parsed.data.action === "clear_hyphen_cache") {
    if (!employee.appUserId) {
      return noStoreJson({ ok: false, error: APP_USER_REQUIRED_ERROR }, 400);
    }

    const clearLink = parsed.data.clearLink !== false;
    const clearFetchCache = parsed.data.clearFetchCache !== false;
    const clearFetchAttempts = parsed.data.clearFetchAttempts !== false;
    const result = await clearHyphenCachesForEmployee({
      employeeId: employee.id,
      appUserId: employee.appUserId,
      clearLink,
      clearFetchCache,
      clearFetchAttempts,
    });
    return noStoreJson({
      ok: true,
      action: parsed.data.action,
      ...result,
    });
  }

  return deleteEmployeeRecord({
    employeeId: employee.id,
    appUserId: employee.appUserId,
    recordType: parsed.data.recordType,
    recordId: parsed.data.recordId,
  });
}
