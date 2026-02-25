import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import {
  buildSurveyQuestionMap,
  ensureActiveB2bSurveyTemplate,
  resolveSectionKeysFromC27Input,
} from "@/lib/b2b/survey-template";
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
  selectedSections: z.array(z.string().trim().min(1)).max(5).optional(),
  answers: z.record(z.string(), z.unknown()).default({}),
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

function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeAnswerValue(raw: unknown) {
  if (raw == null) return { answerText: null, answerValue: null, selectedValues: [] as string[] };
  if (Array.isArray(raw)) {
    const selectedValues = raw.map((item) => toText(item)).filter(Boolean);
    const joined = selectedValues.join(", ");
    return {
      answerText: joined || null,
      answerValue: joined || null,
      selectedValues,
    };
  }
  if (typeof raw === "string") {
    const text = raw.trim();
    return {
      answerText: text.length > 0 ? text : null,
      answerValue: text || null,
      selectedValues: text ? [text] : [],
    };
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    const text = String(raw);
    return { answerText: text, answerValue: text, selectedValues: [text] };
  }
  if (typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const text =
      typeof record.answerText === "string"
        ? record.answerText
        : typeof record.text === "string"
        ? record.text
        : null;
    const value =
      typeof record.answerValue === "string"
        ? record.answerValue
        : typeof record.value === "string"
        ? record.value
        : null;
    const values = Array.isArray(record.values)
      ? record.values.map((item) => toText(item)).filter(Boolean)
      : [];
    const normalizedText = text && text.trim().length > 0 ? text.trim() : null;
    const normalizedValue = value && value.trim().length > 0 ? value.trim() : null;
    return {
      answerText: normalizedText,
      answerValue: normalizedValue ?? normalizedText,
      selectedValues: values.length > 0 ? values : normalizedValue ? [normalizedValue] : [],
    };
  }
  return { answerText: null, answerValue: null, selectedValues: [] };
}

function resolveQuestionScore(
  question: {
    type: "text" | "single" | "multi";
    options?: Array<{ value: string; label: string; score?: number }>;
  },
  normalizedAnswer: ReturnType<typeof normalizeAnswerValue>
) {
  if (!question.options || question.options.length === 0) return null;

  const optionMap = new Map<string, number>();
  for (const option of question.options) {
    if (typeof option.score !== "number" || !Number.isFinite(option.score)) continue;
    optionMap.set(option.value.toLowerCase(), option.score);
    optionMap.set(option.label.toLowerCase(), option.score);
  }

  const candidates = [
    ...normalizedAnswer.selectedValues,
    normalizedAnswer.answerValue || "",
    normalizedAnswer.answerText || "",
  ]
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const matchedScores = candidates
    .map((candidate) => optionMap.get(candidate))
    .filter((score): score is number => typeof score === "number");

  if (matchedScores.length === 0) return null;
  const avg = matchedScores.reduce((sum, score) => sum + score, 0) / matchedScores.length;
  return Number(avg.toFixed(4));
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
    const selectedSections = [
      ...new Set([...(parsed.data.selectedSections ?? []), ...derivedSections]),
    ].slice(0, schema.rules.maxSelectedSections);

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

        const normalized = normalizeAnswerValue(value);
        const score = resolveQuestionScore(question, normalized);
        return {
          responseId: response.id,
          questionKey,
          sectionKey: section?.sectionKey ?? null,
          answerText: normalized.answerText,
          answerValue: normalized.answerValue,
          score,
          meta:
            normalized.selectedValues.length > 1
              ? ({ selectedValues: normalized.selectedValues } as Prisma.InputJsonValue)
              : undefined,
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
