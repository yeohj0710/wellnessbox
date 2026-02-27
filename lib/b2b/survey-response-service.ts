import type { Prisma } from "@prisma/client";
import db from "@/lib/db";

type SurveyAnswerRow = Prisma.B2bSurveyAnswerCreateManyInput;

type UpsertSurveyResponseInput = {
  employeeId: string;
  templateId: string;
  templateVersion: number;
  periodKey: string;
  reportCycle: number | null;
  selectedSections: string[];
  answersJson: Prisma.InputJsonValue | Prisma.JsonNullValueInput;
  buildAnswerRows: (responseId: string) => SurveyAnswerRow[];
};

export async function upsertSurveyResponseWithAnswers(
  input: UpsertSurveyResponseInput
) {
  return db.$transaction(async (tx) => {
    const submittedAt = new Date();

    const latestResponse = await tx.b2bSurveyResponse.findFirst({
      where: {
        employeeId: input.employeeId,
        templateId: input.templateId,
        periodKey: input.periodKey,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    const response = latestResponse
      ? await tx.b2bSurveyResponse.update({
          where: { id: latestResponse.id },
          data: {
            selectedSections: input.selectedSections,
            answersJson: input.answersJson,
            submittedAt,
            periodKey: input.periodKey,
            reportCycle: input.reportCycle,
          },
        })
      : await tx.b2bSurveyResponse.create({
          data: {
            employeeId: input.employeeId,
            templateId: input.templateId,
            templateVersion: input.templateVersion,
            selectedSections: input.selectedSections,
            answersJson: input.answersJson,
            submittedAt,
            periodKey: input.periodKey,
            reportCycle: input.reportCycle,
          },
        });

    await tx.b2bSurveyAnswer.deleteMany({
      where: { responseId: response.id },
    });

    const answerRows = input.buildAnswerRows(response.id);
    if (answerRows.length > 0) {
      await tx.b2bSurveyAnswer.createMany({ data: answerRows });
    }

    return {
      response,
      answerRows,
    };
  });
}
