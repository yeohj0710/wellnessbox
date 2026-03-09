import { Prisma } from "@prisma/client";
import type {
  SurveyGetResponse,
  SurveySaveResult,
} from "@/lib/b2b/admin-report-contract";
import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { periodKeyToCycle, resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { ensureLatestB2bReport } from "@/lib/b2b/report-service";
import { upsertSurveyResponseWithAnswers } from "@/lib/b2b/survey-response-service";
import {
  buildSurveyAnswerRows,
  collectSurveyAvailablePeriods,
  pruneSurveyAnswersForSelectedSections,
  resolveSurveySelectedSections,
  serializeSurveyResponse,
  type SurveyPeriodRow,
  type SurveyResponseRow,
} from "@/lib/b2b/survey-route-helpers";
import {
  buildSurveyQuestionMap,
  ensureActiveB2bSurveyTemplate,
} from "@/lib/b2b/survey-template";

function asJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  if (value == null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export class SurveyRouteInputError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SurveyRouteInputError";
    this.status = status;
  }
}

export async function runAdminSurveyLookup(input: {
  employeeId: string;
  periodKey: string | null;
}): Promise<Omit<SurveyGetResponse, "ok">> {
  const { template, schema } = await ensureActiveB2bSurveyTemplate();

  const [latestResponse, periods] = await Promise.all([
    db.b2bSurveyResponse.findFirst({
      where: {
        employeeId: input.employeeId,
        templateId: template.id,
        ...(input.periodKey ? { periodKey: input.periodKey } : {}),
      },
      include: {
        answers: {
          orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }],
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.b2bSurveyResponse.findMany({
      where: {
        employeeId: input.employeeId,
        templateId: template.id,
        periodKey: { not: null },
      },
      orderBy: [{ periodKey: "desc" }, { updatedAt: "desc" }],
      select: { periodKey: true },
      take: 24,
    }),
  ]);

  return {
    template: {
      id: template.id,
      version: template.version,
      title: template.title,
      schema,
    },
    response: latestResponse
      ? serializeSurveyResponse(latestResponse as unknown as SurveyResponseRow)
      : null,
    periodKey:
      input.periodKey || latestResponse?.periodKey || resolveCurrentPeriodKey(),
    availablePeriods: collectSurveyAvailablePeriods(
      periods as unknown as SurveyPeriodRow[]
    ),
  };
}

export async function runAdminSurveyUpsert(input: {
  employeeId: string;
  periodKey: string;
  selectedSections?: string[];
  answers: Record<string, unknown>;
}): Promise<SurveySaveResult> {
  const { template, schema } = await ensureActiveB2bSurveyTemplate();
  const { commonMap, sectionMap } = buildSurveyQuestionMap(schema);
  const previousResponse = await db.b2bSurveyResponse.findFirst({
    where: {
      employeeId: input.employeeId,
      templateId: template.id,
      periodKey: input.periodKey,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      submittedAt: true,
      selectedSections: true,
      answersJson: true,
    },
  });

  const selectedSections = resolveSurveySelectedSections({
    schema,
    answers: input.answers,
    selectedSections: input.selectedSections,
  });
  if (selectedSections.length > schema.rules.maxSelectedSections) {
    throw new SurveyRouteInputError(
      `\uC0C1\uC138 \uC139\uC158\uC740 \uCD5C\uB300 ${schema.rules.maxSelectedSections}\uAC1C\uAE4C\uC9C0 \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`
    );
  }
  const prunedAnswers = pruneSurveyAnswersForSelectedSections({
    answers: input.answers,
    maps: { commonMap, sectionMap },
    selectedSections,
  });

  const previousSelectedSignature = JSON.stringify(previousResponse?.selectedSections ?? []);
  const nextSelectedSignature = JSON.stringify(selectedSections);
  const previousAnswersSignature = JSON.stringify(previousResponse?.answersJson ?? null);
  const nextAnswersSignature = JSON.stringify(prunedAnswers);
  const shouldSyncReport =
    !previousResponse ||
    previousResponse.submittedAt == null ||
    previousSelectedSignature !== nextSelectedSignature ||
    previousAnswersSignature !== nextAnswersSignature;

  const { response, answerRows } = await upsertSurveyResponseWithAnswers({
    employeeId: input.employeeId,
    templateId: template.id,
    templateVersion: template.version,
    periodKey: input.periodKey,
    reportCycle: periodKeyToCycle(input.periodKey),
    selectedSections,
    answersJson: asJsonValue(prunedAnswers),
    submittedAt: new Date(),
    buildAnswerRows: (responseId) =>
      buildSurveyAnswerRows({
        responseId,
        answers: prunedAnswers,
        maps: { commonMap, sectionMap },
        asJsonValue,
      }),
  });
  const report = shouldSyncReport
    ? await ensureLatestB2bReport(input.employeeId, input.periodKey)
    : null;

  await logB2bAdminAction({
    employeeId: input.employeeId,
    action: "survey_upsert",
    actorTag: "admin",
    payload: {
      responseId: response.id,
      periodKey: input.periodKey,
      selectedSections,
      answerCount: answerRows.length,
    },
  });

  return {
    id: response.id,
    periodKey: response.periodKey ?? input.periodKey,
    reportCycle: response.reportCycle ?? null,
    selectedSections,
    answerCount: answerRows.length,
    updatedAt: response.updatedAt.toISOString(),
    report: report
      ? {
          id: report.id,
          variantIndex: report.variantIndex,
          status: report.status,
          periodKey: report.periodKey ?? input.periodKey,
          updatedAt: report.updatedAt.toISOString(),
        }
      : null,
  };
}

export async function runEmployeeSurveyLookup(input: {
  employeeId: string;
  periodKey: string | null;
}) {
  return runAdminSurveyLookup(input);
}

export async function runEmployeeSurveyUpsert(input: {
  employeeId: string;
  periodKey: string;
  selectedSections?: string[];
  answers: Record<string, unknown>;
  finalize?: boolean;
}) {
  const { template, schema } = await ensureActiveB2bSurveyTemplate();
  const { commonMap, sectionMap } = buildSurveyQuestionMap(schema);

  const selectedSections = resolveSurveySelectedSections({
    schema,
    answers: input.answers,
    selectedSections: input.selectedSections,
  });
  if (selectedSections.length > schema.rules.maxSelectedSections) {
    throw new SurveyRouteInputError(
      `상세 섹션은 최대 ${schema.rules.maxSelectedSections}개까지 선택할 수 있습니다.`
    );
  }

  const prunedAnswers = pruneSurveyAnswersForSelectedSections({
    answers: input.answers,
    maps: { commonMap, sectionMap },
    selectedSections,
  });

  const shouldSyncReport = input.finalize === true;

  const { response, answerRows } = await upsertSurveyResponseWithAnswers({
    employeeId: input.employeeId,
    templateId: template.id,
    templateVersion: template.version,
    periodKey: input.periodKey,
    reportCycle: periodKeyToCycle(input.periodKey),
    selectedSections,
    answersJson: asJsonValue(prunedAnswers),
    preserveSubmittedOnDraft: true,
    ...(input.finalize ? { submittedAt: new Date() } : {}),
    buildAnswerRows: (responseId) =>
      buildSurveyAnswerRows({
        responseId,
        answers: prunedAnswers,
        maps: { commonMap, sectionMap },
        asJsonValue,
      }),
  });
  if (input.finalize === true) {
    await db.b2bEmployee.update({
      where: { id: input.employeeId },
      data: { updatedAt: new Date() },
    });
  }
  const report =
    shouldSyncReport
      ? await ensureLatestB2bReport(input.employeeId, input.periodKey)
      : null;

  return {
    id: response.id,
    periodKey: response.periodKey ?? input.periodKey,
    reportCycle: response.reportCycle ?? null,
    selectedSections,
    answerCount: answerRows.length,
    submittedAt: response.submittedAt?.toISOString() ?? null,
    updatedAt: response.updatedAt.toISOString(),
    report: report
      ? {
          id: report.id,
          variantIndex: report.variantIndex,
          status: report.status,
          periodKey: report.periodKey ?? input.periodKey,
          updatedAt: report.updatedAt.toISOString(),
        }
      : null,
  };
}
