import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import {
  buildSurveyQuestionMap,
  ensureActiveB2bSurveyTemplate,
  resolveSectionKeysFromC27Input,
} from "@/lib/b2b/survey-template";
import {
  normalizeSurveyAnswerValue,
  resolveSurveyQuestionScore,
} from "@/lib/b2b/survey-answer";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { periodKeyToCycle, resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { requireAdminSession } from "@/lib/server/route-auth";
import { resolveDbRouteError } from "@/lib/server/db-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ employeeId: string }>;
};

const putSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  selectedSections: z.array(z.string().trim().min(1)).max(24).optional(),
  answers: z
    .record(
      z.string().trim().min(1),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.union([z.string(), z.number(), z.boolean()])),
        z.object({
          answerText: z.string().optional(),
          text: z.string().optional(),
          answerValue: z.string().optional(),
          value: z.string().optional(),
          values: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
          selectedValues: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
          fieldValues: z.record(z.string().trim().min(1), z.union([z.string(), z.number()])).optional(),
          score: z.number().min(0).max(1).optional(),
          variantId: z.string().trim().min(1).optional(),
        }),
      ])
    )
    .default({}),
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function asJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  if (value == null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const periodKey = searchParams.get("period");

    const { employeeId } = await ctx.params;
    const employee = await db.b2bEmployee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
    }

    const { template, schema } = await ensureActiveB2bSurveyTemplate();
    const latestResponse = await db.b2bSurveyResponse.findFirst({
      where: {
        employeeId,
        templateId: template.id,
        ...(periodKey ? { periodKey } : {}),
      },
      include: {
        answers: {
          orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }],
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const periods = await db.b2bSurveyResponse.findMany({
      where: { employeeId, templateId: template.id, periodKey: { not: null } },
      orderBy: [{ periodKey: "desc" }, { updatedAt: "desc" }],
      select: { periodKey: true },
      take: 24,
    });
    const availablePeriods = [
      ...new Set(periods.map((row) => row.periodKey).filter((row): row is string => Boolean(row))),
    ];

    return noStoreJson({
      ok: true,
      template: {
        id: template.id,
        version: template.version,
        title: template.title,
        schema,
      },
      response: latestResponse
        ? {
            id: latestResponse.id,
            periodKey: latestResponse.periodKey ?? null,
            reportCycle: latestResponse.reportCycle ?? null,
            selectedSections: latestResponse.selectedSections,
            answersJson: latestResponse.answersJson,
            updatedAt: latestResponse.updatedAt.toISOString(),
            answers: latestResponse.answers.map((answer) => ({
              questionKey: answer.questionKey,
              sectionKey: answer.sectionKey,
              answerText: answer.answerText,
              answerValue: answer.answerValue,
              score: answer.score,
              meta: answer.meta,
            })),
          }
        : null,
      periodKey: periodKey || latestResponse?.periodKey || resolveCurrentPeriodKey(),
      availablePeriods,
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "설문 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}

export async function PUT(req: Request, ctx: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { employeeId } = await ctx.params;
    const employee = await db.b2bEmployee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
    }

    const body = await req.json().catch(() => null);
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return noStoreJson(
        { ok: false, error: parsed.error.issues[0]?.message || "입력 형식을 확인해 주세요." },
        400
      );
    }

    const periodKey = parsed.data.periodKey ?? resolveCurrentPeriodKey();
    const reportCycle = periodKeyToCycle(periodKey);

    const { template, schema } = await ensureActiveB2bSurveyTemplate();
    const { commonMap, sectionMap } = buildSurveyQuestionMap(schema);

    const q27Value = parsed.data.answers[schema.rules.selectSectionByCommonQuestionKey] ?? null;
    const derivedSections = resolveSectionKeysFromC27Input(schema, q27Value);
    const allowedSectionKeys = new Set(schema.sectionCatalog.map((section) => section.key));
    const selectedSections = [...new Set([...(parsed.data.selectedSections ?? []), ...derivedSections])]
      .filter((sectionKey) => allowedSectionKeys.has(sectionKey));
    if (selectedSections.length > schema.rules.maxSelectedSections) {
      return noStoreJson(
        {
          ok: false,
          error: `상세 섹션은 최대 ${schema.rules.maxSelectedSections}개까지 선택할 수 있습니다.`,
        },
        400
      );
    }

    const latestResponse = await db.b2bSurveyResponse.findFirst({
      where: { employeeId, templateId: template.id, periodKey },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    const response = latestResponse
      ? await db.b2bSurveyResponse.update({
          where: { id: latestResponse.id },
          data: {
            selectedSections,
            answersJson: asJsonValue(parsed.data.answers),
            submittedAt: new Date(),
            periodKey,
            reportCycle: reportCycle ?? null,
          },
        })
      : await db.b2bSurveyResponse.create({
          data: {
            employeeId,
            templateId: template.id,
            templateVersion: template.version,
            selectedSections,
            answersJson: asJsonValue(parsed.data.answers),
            submittedAt: new Date(),
            periodKey,
            reportCycle: reportCycle ?? null,
          },
        });

    await db.b2bSurveyAnswer.deleteMany({
      where: { responseId: response.id },
    });

    const answerRows = Object.entries(parsed.data.answers)
      .map(([questionKey, value]) => {
        const common = commonMap.get(questionKey);
        const section = sectionMap.get(questionKey);
        const question = common ?? section;
        if (!question) return null;

        const normalized = normalizeSurveyAnswerValue(value);
        const score = resolveSurveyQuestionScore(question, normalized);
        const answerMeta = {
          selectedValues: normalized.selectedValues,
          variantId: normalized.variantId ?? "base",
          lockedScore: score,
          fieldValues: normalized.fieldValues,
        };
        return {
          responseId: response.id,
          questionKey,
          sectionKey: section?.sectionKey ?? null,
          answerText: normalized.answerText,
          answerValue: normalized.answerValue,
          score,
          meta: asJsonValue(answerMeta),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (answerRows.length > 0) {
      await db.b2bSurveyAnswer.createMany({ data: answerRows });
    }

    await logB2bAdminAction({
      employeeId,
      action: "survey_upsert",
      actorTag: "admin",
      payload: {
        responseId: response.id,
        periodKey,
        selectedSections,
        answerCount: answerRows.length,
      },
    });

    return noStoreJson({
      ok: true,
      response: {
        id: response.id,
        periodKey: response.periodKey ?? periodKey,
        reportCycle: response.reportCycle ?? null,
        selectedSections,
        answerCount: answerRows.length,
        updatedAt: response.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "설문 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
