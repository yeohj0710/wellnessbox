import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdminSession } from "@/lib/server/route-auth";
import { resolveDbRouteError } from "@/lib/server/db-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ employeeId: string }>;
};

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { employeeId } = await ctx.params;
    if (!employeeId) {
      return noStoreJson({ ok: false, error: "employeeId가 필요합니다." }, 400);
    }

    const employee = await db.b2bEmployee.findUnique({
      where: { id: employeeId },
      include: {
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
      },
    });

    if (!employee) {
      return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
    }

    return noStoreJson({
      ok: true,
      employee: {
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
        latestSurvey: employee.surveyResponses[0]
          ? {
              id: employee.surveyResponses[0].id,
              periodKey: employee.surveyResponses[0].periodKey,
              reportCycle: employee.surveyResponses[0].reportCycle,
              templateVersion: employee.surveyResponses[0].templateVersion,
              selectedSections: employee.surveyResponses[0].selectedSections,
              answersJson: employee.surveyResponses[0].answersJson,
              updatedAt: employee.surveyResponses[0].updatedAt.toISOString(),
              answers: employee.surveyResponses[0].answers.map((answer) => ({
                id: answer.id,
                questionKey: answer.questionKey,
                sectionKey: answer.sectionKey,
                answerText: answer.answerText,
                answerValue: answer.answerValue,
              })),
            }
          : null,
        latestAnalysis: employee.analysisResults[0]
          ? {
              id: employee.analysisResults[0].id,
              version: employee.analysisResults[0].version,
              periodKey: employee.analysisResults[0].periodKey,
              reportCycle: employee.analysisResults[0].reportCycle,
              payload: employee.analysisResults[0].payload,
              updatedAt: employee.analysisResults[0].updatedAt.toISOString(),
            }
          : null,
        latestPharmacistNote: employee.pharmacistNotes[0]
          ? {
              id: employee.pharmacistNotes[0].id,
              note: employee.pharmacistNotes[0].note,
              recommendations: employee.pharmacistNotes[0].recommendations,
              cautions: employee.pharmacistNotes[0].cautions,
              periodKey: employee.pharmacistNotes[0].periodKey,
              reportCycle: employee.pharmacistNotes[0].reportCycle,
              updatedAt: employee.pharmacistNotes[0].updatedAt.toISOString(),
            }
          : null,
        reports: employee.reports.map((report) => ({
          id: report.id,
          variantIndex: report.variantIndex,
          periodKey: report.periodKey,
          reportCycle: report.reportCycle,
          status: report.status,
          pageSize: report.pageSize,
          stylePreset: report.stylePreset,
          createdAt: report.createdAt.toISOString(),
          updatedAt: report.updatedAt.toISOString(),
        })),
        accessLogs: employee.accessLogs.map((log) => ({
          id: log.id,
          action: log.action,
          route: log.route,
          createdAt: log.createdAt.toISOString(),
          payload: log.payload,
        })),
      },
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "임직원 상세 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
