import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { computeAndSaveB2bAnalysis } from "@/lib/b2b/analysis-service";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ employeeId: string }>;
};

const periodKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const putSchema = z.object({
  payload: z.unknown(),
  periodKey: periodKeySchema.optional(),
  generateAiEvaluation: z.boolean().optional(),
});

const postSchema = z.object({
  periodKey: periodKeySchema.optional(),
  generateAiEvaluation: z.boolean().optional(),
  forceAiRegenerate: z.boolean().optional(),
  externalAnalysisPayload: z.unknown().optional(),
  replaceLatestPeriodEntry: z.boolean().optional(),
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function requireEmployee(employeeId: string) {
  return db.b2bEmployee.findUnique({ where: { id: employeeId } });
}

function summarizeComputedForResponse(computed: Record<string, unknown>) {
  return {
    periodKey:
      typeof computed.periodKey === "string"
        ? computed.periodKey
        : resolveCurrentPeriodKey(),
    summary:
      typeof computed.summary === "object" && computed.summary
        ? computed.summary
        : null,
    trend:
      typeof computed.trend === "object" && computed.trend
        ? computed.trend
        : null,
    aiEvaluation:
      typeof computed.aiEvaluation === "object" && computed.aiEvaluation
        ? computed.aiEvaluation
        : null,
  };
}

export async function GET(req: Request, ctx: RouteContext) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { employeeId } = await ctx.params;
  const employee = await requireEmployee(employeeId);
  if (!employee) {
    return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
  }

  const { searchParams } = new URL(req.url);
  const periodKey = searchParams.get("period");

  const [latest, periods] = await Promise.all([
    db.b2bAnalysisResult.findFirst({
      where: {
        employeeId,
        ...(periodKey ? { periodKey } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
    }),
    db.b2bAnalysisResult.findMany({
      where: { employeeId, periodKey: { not: null } },
      orderBy: [{ periodKey: "desc" }, { version: "desc" }],
      select: { periodKey: true },
      take: 24,
    }),
  ]);

  const availablePeriods = [
    ...new Set(periods.map((row) => row.periodKey).filter((row): row is string => Boolean(row))),
  ];

  return noStoreJson({
    ok: true,
    analysis: latest
      ? {
          id: latest.id,
          version: latest.version,
          periodKey: latest.periodKey ?? null,
          reportCycle: latest.reportCycle ?? null,
          payload: latest.payload,
          computedAt: latest.computedAt?.toISOString() ?? null,
          updatedAt: latest.updatedAt.toISOString(),
        }
      : null,
    periodKey: periodKey || latest?.periodKey || resolveCurrentPeriodKey(),
    availablePeriods,
  });
}

export async function PUT(req: Request, ctx: RouteContext) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { employeeId } = await ctx.params;
  const employee = await requireEmployee(employeeId);
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
  const saved = await computeAndSaveB2bAnalysis({
    employeeId,
    periodKey,
    externalAnalysisPayload: parsed.data.payload,
    replaceLatestPeriodEntry: true,
    generateAiEvaluation: parsed.data.generateAiEvaluation,
  });

  await logB2bAdminAction({
    employeeId,
    action: "analysis_external_payload_upsert",
    actorTag: "admin",
    payload: {
      analysisId: saved.analysis.id,
      periodKey,
      generateAiEvaluation: parsed.data.generateAiEvaluation === true,
    },
  });

  return noStoreJson({
    ok: true,
    analysis: {
      id: saved.analysis.id,
      version: saved.analysis.version,
      reportCycle: saved.analysis.reportCycle ?? null,
      updatedAt: saved.analysis.updatedAt.toISOString(),
      ...summarizeComputedForResponse(saved.computed as Record<string, unknown>),
    },
  });
}

export async function POST(req: Request, ctx: RouteContext) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { employeeId } = await ctx.params;
  const employee = await requireEmployee(employeeId);
  if (!employee) {
    return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson(
      { ok: false, error: parsed.error.issues[0]?.message || "입력 형식을 확인해 주세요." },
      400
    );
  }

  const periodKey = parsed.data.periodKey ?? resolveCurrentPeriodKey();
  const saved = await computeAndSaveB2bAnalysis({
    employeeId,
    periodKey,
    generateAiEvaluation: parsed.data.generateAiEvaluation,
    forceAiRegenerate: parsed.data.forceAiRegenerate,
    externalAnalysisPayload: parsed.data.externalAnalysisPayload,
    replaceLatestPeriodEntry: parsed.data.replaceLatestPeriodEntry,
  });

  await logB2bAdminAction({
    employeeId,
    action: "analysis_recompute",
    actorTag: "admin",
    payload: {
      analysisId: saved.analysis.id,
      periodKey,
      generateAiEvaluation: parsed.data.generateAiEvaluation === true,
      forceAiRegenerate: parsed.data.forceAiRegenerate === true,
    },
  });

  return noStoreJson({
    ok: true,
    analysis: {
      id: saved.analysis.id,
      version: saved.analysis.version,
      reportCycle: saved.analysis.reportCycle ?? null,
      updatedAt: saved.analysis.updatedAt.toISOString(),
      ...summarizeComputedForResponse(saved.computed as Record<string, unknown>),
    },
  });
}
