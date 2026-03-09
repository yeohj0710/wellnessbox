import "server-only";

import type { EmployeeOpsResponse } from "@/lib/b2b/admin-employee-management-contract";
import { B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";

type EmployeeIdentityRow = {
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
};

type EmployeeRow = EmployeeIdentityRow & {
  _count: {
    healthSnapshots: number;
    surveyResponses: number;
    analysisResults: number;
    pharmacistNotes: number;
    reports: number;
    accessLogs: number;
    adminActionLogs: number;
  };
};

type HealthSnapshotRow = {
  id: string;
  provider: string;
  sourceMode: string;
  periodKey: string | null;
  reportCycle: number | null;
  fetchedAt: Date;
  createdAt: Date;
  normalizedJson: unknown;
  rawJson: unknown;
};

type SurveyAnswerRow = {
  id: string;
  questionKey: string;
  sectionKey: string | null;
  answerText: string | null;
  answerValue: string | null;
  score: number | null;
  meta: unknown;
};

type SurveyResponseRow = {
  id: string;
  templateId: string;
  templateVersion: number;
  periodKey: string | null;
  reportCycle: number | null;
  selectedSections: string[];
  answersJson: unknown;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  answers: SurveyAnswerRow[];
};

type AnalysisResultRow = {
  id: string;
  version: number;
  periodKey: string | null;
  reportCycle: number | null;
  computedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  payload: unknown;
};

type PharmacistNoteRow = {
  id: string;
  periodKey: string | null;
  reportCycle: number | null;
  note: string | null;
  recommendations: string | null;
  cautions: string | null;
  createdByAdminTag: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ReportRow = {
  id: string;
  variantIndex: number;
  status: string;
  pageSize: string;
  stylePreset: string | null;
  periodKey: string | null;
  reportCycle: number | null;
  createdAt: Date;
  updatedAt: Date;
  reportPayload: unknown;
  layoutDsl: unknown;
  exportAudit: unknown;
};

type AccessLogRow = {
  id: string;
  action: string;
  route: string | null;
  userAgent: string | null;
  payload: unknown;
  createdAt: Date;
};

type AdminActionLogRow = {
  id: string;
  action: string;
  actorTag: string | null;
  payload: unknown;
  createdAt: Date;
};

type HealthLinkRow = {
  provider: string;
  linked: boolean;
  loginMethod: string | null;
  loginOrgCd: string | null;
  stepMode: string | null;
  lastLinkedAt: Date | null;
  lastFetchedAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  updatedAt: Date;
  cookieData: unknown;
  stepData: unknown;
};

type HealthFetchCacheRow = {
  id: string;
  requestHash: string | null;
  requestKey: string | null;
  targets: string[];
  yearLimit: number | null;
  subjectType: string | null;
  statusCode: number | null;
  ok: boolean | null;
  partial: boolean | null;
  fetchedAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastHitAt: Date | null;
};

type HealthFetchAttemptRow = {
  id: string;
  requestHash: string | null;
  requestKey: string | null;
  identityHash: string | null;
  forceRefresh: boolean;
  cached: boolean;
  statusCode: number | null;
  ok: boolean | null;
  createdAt: Date;
};

type BuildAdminEmployeeOpsPayloadInput = {
  employee: EmployeeRow;
  appUserId: string | null;
  provider: string;
  healthSnapshots: HealthSnapshotRow[];
  surveyResponses: SurveyResponseRow[];
  analysisResults: AnalysisResultRow[];
  pharmacistNotes: PharmacistNoteRow[];
  reports: ReportRow[];
  accessLogs: AccessLogRow[];
  adminActionLogs: AdminActionLogRow[];
  link: HealthLinkRow | null;
  cacheCountTotal: number;
  cacheCountValid: number;
  fetchCaches: HealthFetchCacheRow[];
  fetchAttempts: HealthFetchAttemptRow[];
};

export function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function mergePeriods(...groups: Array<Array<string | null> | undefined>) {
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

export function summarizeJsonShape(value: unknown) {
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

export function serializeEmployeeRow(
  employee: EmployeeIdentityRow
): EmployeeOpsResponse["employee"] {
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

export function buildAdminEmployeeOpsPayload(
  input: BuildAdminEmployeeOpsPayloadInput
): EmployeeOpsResponse {
  const periods = mergePeriods(
    input.healthSnapshots.map((row) => row.periodKey),
    input.surveyResponses.map((row) => row.periodKey),
    input.analysisResults.map((row) => row.periodKey),
    input.pharmacistNotes.map((row) => row.periodKey),
    input.reports.map((row) => row.periodKey)
  );

  return {
    ok: true as const,
    employee: serializeEmployeeRow(input.employee),
    summary: {
      periods,
      counts: {
        healthSnapshots: input.employee._count.healthSnapshots,
        surveyResponses: input.employee._count.surveyResponses,
        analysisResults: input.employee._count.analysisResults,
        pharmacistNotes: input.employee._count.pharmacistNotes,
        reports: input.employee._count.reports,
        accessLogs: input.employee._count.accessLogs,
        adminActionLogs: input.employee._count.adminActionLogs,
        healthFetchCaches: input.cacheCountTotal,
        healthFetchCachesValid: input.cacheCountValid,
        healthFetchAttempts: input.fetchAttempts.length,
      },
    },
    records: {
      healthSnapshots: input.healthSnapshots.map((snapshot) => ({
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
      surveyResponses: input.surveyResponses.map((survey) => ({
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
      analysisResults: input.analysisResults.map((analysis) => ({
        id: analysis.id,
        version: analysis.version,
        periodKey: analysis.periodKey,
        reportCycle: analysis.reportCycle,
        payload: analysis.payload,
        computedAt: toIso(analysis.computedAt),
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: analysis.updatedAt.toISOString(),
      })),
      pharmacistNotes: input.pharmacistNotes.map((note) => ({
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
      reports: input.reports.map((report) => ({
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
      accessLogs: input.accessLogs.map((log) => ({
        id: log.id,
        action: log.action,
        route: log.route,
        userAgent: log.userAgent,
        payload: log.payload,
        createdAt: log.createdAt.toISOString(),
      })),
      adminActionLogs: input.adminActionLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorTag: log.actorTag,
        payload: log.payload,
        createdAt: log.createdAt.toISOString(),
      })),
    },
    healthLink: input.appUserId
      ? {
          provider: input.provider,
          appUserId: input.appUserId,
          link: input.link
            ? {
                provider: input.link.provider,
                linked: input.link.linked,
                loginMethod: input.link.loginMethod,
                loginOrgCd: input.link.loginOrgCd,
                stepMode: input.link.stepMode,
                lastLinkedAt: toIso(input.link.lastLinkedAt),
                lastFetchedAt: toIso(input.link.lastFetchedAt),
                lastErrorCode: input.link.lastErrorCode,
                lastErrorMessage: input.link.lastErrorMessage,
                hasStepData: Boolean(input.link.stepData),
                hasCookieData: Boolean(input.link.cookieData),
                updatedAt: input.link.updatedAt.toISOString(),
              }
            : null,
          cacheSummary: {
            totalEntries: input.cacheCountTotal,
            validEntries: input.cacheCountValid,
          },
          fetchCaches: input.fetchCaches.map((cache) => ({
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
          fetchAttempts: input.fetchAttempts.map((attempt) => ({
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
  };
}
