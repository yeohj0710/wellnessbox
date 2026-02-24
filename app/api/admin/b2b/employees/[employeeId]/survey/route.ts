import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import {
  buildSurveyQuestionMap,
  ensureActiveB2bSurveyTemplate,
} from "@/lib/b2b/survey-template";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ employeeId: string }>;
};

const putSchema = z.object({
  selectedSections: z.array(z.string().trim().min(1)).max(5).optional(),
  answers: z.record(z.string(), z.unknown()).default({}),
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function asJsonValue(
  value: unknown
): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  if (value == null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function resolveAnswerValue(raw: unknown) {
  if (raw == null) return { answerText: null, answerValue: null };
  if (typeof raw === "string") {
    const text = raw.trim();
    return { answerText: text.length > 0 ? text : null, answerValue: null };
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    return { answerText: String(raw), answerValue: String(raw) };
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
    return {
      answerText: text && text.trim().length > 0 ? text.trim() : null,
      answerValue: value && value.trim().length > 0 ? value.trim() : null,
    };
  }
  return { answerText: null, answerValue: null };
}

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { employeeId } = await ctx.params;
  const employee = await db.b2bEmployee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
  }

  const { template, schema } = await ensureActiveB2bSurveyTemplate();
  const latestResponse = await db.b2bSurveyResponse.findFirst({
    where: { employeeId, templateId: template.id },
    include: {
      answers: {
        orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }],
      },
    },
    orderBy: { updatedAt: "desc" },
  });

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
          selectedSections: latestResponse.selectedSections,
          answersJson: latestResponse.answersJson,
          updatedAt: latestResponse.updatedAt.toISOString(),
          answers: latestResponse.answers.map((answer) => ({
            questionKey: answer.questionKey,
            sectionKey: answer.sectionKey,
            answerText: answer.answerText,
            answerValue: answer.answerValue,
          })),
        }
      : null,
  });
}

export async function PUT(req: Request, ctx: RouteContext) {
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
      { ok: false, error: parsed.error.issues[0]?.message || "입력 형식이 올바르지 않습니다." },
      400
    );
  }

  const { template, schema } = await ensureActiveB2bSurveyTemplate();
  const { commonMap, sectionMap } = buildSurveyQuestionMap(schema);

  const selectedSections = [...new Set(parsed.data.selectedSections ?? [])].slice(
    0,
    schema.rules.maxSelectedSections
  );
  const answersJson = parsed.data.answers;

  const latestResponse = await db.b2bSurveyResponse.findFirst({
    where: { employeeId, templateId: template.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const response = latestResponse
    ? await db.b2bSurveyResponse.update({
        where: { id: latestResponse.id },
        data: {
          selectedSections,
          answersJson: asJsonValue(answersJson),
          submittedAt: new Date(),
        },
      })
    : await db.b2bSurveyResponse.create({
        data: {
          employeeId,
          templateId: template.id,
          templateVersion: template.version,
          selectedSections,
          answersJson: asJsonValue(answersJson),
          submittedAt: new Date(),
        },
      });

  await db.b2bSurveyAnswer.deleteMany({
    where: { responseId: response.id },
  });

  const answerRows = Object.entries(parsed.data.answers)
    .map(([questionKey, value]) => {
      const common = commonMap.get(questionKey);
      const section = sectionMap.get(questionKey);
      if (!common && !section) return null;
      const normalized = resolveAnswerValue(value);
      return {
        responseId: response.id,
        questionKey,
        sectionKey: section?.sectionKey ?? null,
        answerText: normalized.answerText,
        answerValue: normalized.answerValue,
      };
    })
    .filter((item): item is NonNullable<typeof item> => !!item);

  if (answerRows.length > 0) {
    await db.b2bSurveyAnswer.createMany({ data: answerRows });
  }

  await logB2bAdminAction({
    employeeId,
    action: "survey_upsert",
    actorTag: "admin",
    payload: {
      responseId: response.id,
      selectedSections,
      answerCount: answerRows.length,
    },
  });

  return noStoreJson({
    ok: true,
    response: {
      id: response.id,
      selectedSections,
      answerCount: answerRows.length,
      updatedAt: response.updatedAt.toISOString(),
    },
  });
}
