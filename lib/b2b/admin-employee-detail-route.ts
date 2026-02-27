import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { serializeB2bReportListItem } from "@/lib/b2b/report-route-serializers";
import {
  requireAdminEmployeeId,
  type B2bEmployeeRouteContext,
} from "@/lib/b2b/admin-employee-route";
import { noStoreJson } from "@/lib/server/no-store";

export const ADMIN_EMPLOYEE_DETAIL_INCLUDE = {
  healthSnapshots: {
    orderBy: { fetchedAt: "desc" },
    take: 3,
  },
  surveyResponses: {
    orderBy: { updatedAt: "desc" },
    take: 1,
    include: {
      answers: {
        orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }],
      },
    },
  },
  analysisResults: {
    orderBy: [{ periodKey: "desc" }, { version: "desc" }, { createdAt: "desc" }],
    take: 1,
  },
  pharmacistNotes: {
    orderBy: [{ periodKey: "desc" }, { updatedAt: "desc" }],
    take: 1,
  },
  reports: {
    orderBy: [{ periodKey: "desc" }, { variantIndex: "desc" }, { createdAt: "desc" }],
    take: 5,
  },
  accessLogs: {
    orderBy: { createdAt: "desc" },
    take: 20,
  },
} satisfies Prisma.B2bEmployeeInclude;

type AdminEmployeeDetailRecord = Prisma.B2bEmployeeGetPayload<
  { include: typeof ADMIN_EMPLOYEE_DETAIL_INCLUDE }
>;

function serializeLatestSurvey(
  survey: AdminEmployeeDetailRecord["surveyResponses"][number] | undefined
) {
  if (!survey) return null;
  return {
    id: survey.id,
    periodKey: survey.periodKey,
    reportCycle: survey.reportCycle,
    templateVersion: survey.templateVersion,
    selectedSections: survey.selectedSections,
    answersJson: survey.answersJson,
    updatedAt: survey.updatedAt.toISOString(),
    answers: survey.answers.map((answer) => ({
      id: answer.id,
      questionKey: answer.questionKey,
      sectionKey: answer.sectionKey,
      answerText: answer.answerText,
      answerValue: answer.answerValue,
    })),
  };
}

function serializeLatestAnalysis(
  analysis: AdminEmployeeDetailRecord["analysisResults"][number] | undefined
) {
  if (!analysis) return null;
  return {
    id: analysis.id,
    version: analysis.version,
    periodKey: analysis.periodKey,
    reportCycle: analysis.reportCycle,
    payload: analysis.payload,
    updatedAt: analysis.updatedAt.toISOString(),
  };
}

function serializeLatestPharmacistNote(
  note: AdminEmployeeDetailRecord["pharmacistNotes"][number] | undefined
) {
  if (!note) return null;
  return {
    id: note.id,
    note: note.note,
    recommendations: note.recommendations,
    cautions: note.cautions,
    periodKey: note.periodKey,
    reportCycle: note.reportCycle,
    updatedAt: note.updatedAt.toISOString(),
  };
}

export function serializeAdminEmployeeDetail(
  employee: AdminEmployeeDetailRecord
) {
  return {
    id: employee.id,
    name: employee.name,
    birthDate: employee.birthDate,
    phoneNormalized: employee.phoneNormalized,
    identityHash: employee.identityHash,
    linkedProvider: employee.linkedProvider,
    lastSyncedAt: employee.lastSyncedAt?.toISOString() ?? null,
    lastViewedAt: employee.lastViewedAt?.toISOString() ?? null,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
    healthSnapshots: employee.healthSnapshots.map((snapshot) => ({
      id: snapshot.id,
      provider: snapshot.provider,
      sourceMode: snapshot.sourceMode,
      periodKey: snapshot.periodKey,
      fetchedAt: snapshot.fetchedAt.toISOString(),
      normalizedJson: snapshot.normalizedJson,
      rawJson: snapshot.rawJson,
    })),
    latestSurvey: serializeLatestSurvey(employee.surveyResponses[0]),
    latestAnalysis: serializeLatestAnalysis(employee.analysisResults[0]),
    latestPharmacistNote: serializeLatestPharmacistNote(
      employee.pharmacistNotes[0]
    ),
    reports: employee.reports.map((report) => serializeB2bReportListItem(report)),
    accessLogs: employee.accessLogs.map((log) => ({
      id: log.id,
      action: log.action,
      route: log.route,
      createdAt: log.createdAt.toISOString(),
      payload: log.payload,
    })),
  };
}

const ADMIN_EMPLOYEE_NOT_FOUND_ERROR =
  "\uC9C1\uC6D0\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";

export async function runAdminEmployeeDetailGetRoute(
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const employee = await db.b2bEmployee.findUnique({
    where: { id: authEmployee.employeeId },
    include: ADMIN_EMPLOYEE_DETAIL_INCLUDE,
  });

  if (!employee) {
    return noStoreJson({ ok: false, error: ADMIN_EMPLOYEE_NOT_FOUND_ERROR }, 404);
  }

  return noStoreJson({
    ok: true,
    employee: serializeAdminEmployeeDetail(employee),
  });
}

export function runAdminEmployeeDetailGetRouteWithRequest(
  _req: Request,
  ctx: B2bEmployeeRouteContext
) {
  return runAdminEmployeeDetailGetRoute(ctx);
}
