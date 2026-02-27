import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { periodKeyToCycle, resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { upsertSurveyResponseWithAnswers } from "@/lib/b2b/survey-response-service";
import {
  buildSurveyAnswerRows,
  collectSurveyAvailablePeriods,
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
}) {
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
      `\uC0C1\uC138 \uC139\uC158\uC740 \uCD5C\uB300 ${schema.rules.maxSelectedSections}\uAC1C\uAE4C\uC9C0 \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`
    );
  }

  const { response, answerRows } = await upsertSurveyResponseWithAnswers({
    employeeId: input.employeeId,
    templateId: template.id,
    templateVersion: template.version,
    periodKey: input.periodKey,
    reportCycle: periodKeyToCycle(input.periodKey),
    selectedSections,
    answersJson: asJsonValue(input.answers),
    buildAnswerRows: (responseId) =>
      buildSurveyAnswerRows({
        responseId,
        answers: input.answers,
        maps: { commonMap, sectionMap },
        asJsonValue,
      }),
  });

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
  };
}
