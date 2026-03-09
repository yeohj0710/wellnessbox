import "server-only";

import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { managedEmployeeSelect } from "@/lib/b2b/admin-employee-management-route-employee";
import { buildAdminEmployeeOpsPayload } from "@/lib/b2b/admin-employee-management-route-response";
import { HYPHEN_PROVIDER } from "@/lib/server/hyphen/client";

const RECENT_RECORD_TAKE = 30;
const RECENT_LOG_TAKE = 40;

const employeeOpsPayloadSelect = {
  ...managedEmployeeSelect,
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
} satisfies Prisma.B2bEmployeeSelect;

export async function loadAdminEmployeeOpsPayload(employeeId: string) {
  const employee = await db.b2bEmployee.findUnique({
    where: { id: employeeId },
    select: employeeOpsPayloadSelect,
  });

  if (!employee) {
    return null;
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

  return buildAdminEmployeeOpsPayload({
    employee,
    appUserId,
    provider,
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
  });
}
