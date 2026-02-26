import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { pickStylePreset } from "@/lib/b2b/export/layout-dsl";
import { runB2bLayoutPipeline } from "@/lib/b2b/export/pipeline";
import type { PageSizeKey, StylePreset } from "@/lib/b2b/export/layout-types";
import type { B2bReportPayload } from "@/lib/b2b/report-payload";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ reportId: string }>;
};

const patchSchema = z.object({
  displayPeriodKey: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "표기 연월은 YYYY-MM 형식으로 입력해 주세요."),
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function asJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function toReportPayload(raw: unknown): B2bReportPayload | null {
  if (!raw || typeof raw !== "object") return null;
  return asJsonValue(raw) as B2bReportPayload;
}

function withDisplayPeriod(
  payload: B2bReportPayload,
  displayPeriodKey: string
): B2bReportPayload {
  return {
    ...payload,
    meta: {
      ...(payload.meta ?? {}),
      periodKey: displayPeriodKey,
    },
  };
}

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { reportId } = await ctx.params;
    const report = await db.b2bReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        employeeId: true,
        variantIndex: true,
        pageSize: true,
        stylePreset: true,
        reportPayload: true,
      },
    });
    if (!report) {
      return noStoreJson({ ok: false, error: "레포트를 찾을 수 없습니다." }, 404);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return noStoreJson(
        { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
        400
      );
    }

    const payload = toReportPayload(report.reportPayload);
    if (!payload) {
      return noStoreJson(
        { ok: false, error: "레포트 본문 데이터를 읽을 수 없습니다." },
        400
      );
    }

    const nextPayload = withDisplayPeriod(payload, parsed.data.displayPeriodKey);
    const pageSize = (report.pageSize || "A4") as PageSizeKey;
    const stylePreset = (report.stylePreset ||
      pickStylePreset(report.variantIndex)) as StylePreset;
    const layoutResult = await runB2bLayoutPipeline({
      payload: nextPayload,
      intent: "export",
      pageSize,
      variantIndex: report.variantIndex,
      stylePreset,
    });

    if (!layoutResult.ok) {
      const debugId = randomUUID();
      return noStoreJson(
        {
          ok: false,
          code: "LAYOUT_VALIDATION_FAILED",
          reason: "layout_validation_failed",
          debugId,
          error: "연월 반영 중 레이아웃 검증에 실패했습니다.",
          audit: layoutResult.audit,
          issues: layoutResult.issues,
        },
        400
      );
    }

    const updated = await db.b2bReport.update({
      where: { id: report.id },
      data: {
        status: "ready",
        reportPayload: asJsonValue(nextPayload),
        layoutDsl: asJsonValue(layoutResult.layout),
        exportAudit: asJsonValue(layoutResult.audit),
      },
    });

    await logB2bAdminAction({
      employeeId: report.employeeId,
      action: "report_display_period_update",
      actorTag: "admin",
      payload: {
        reportId: updated.id,
        periodKey: updated.periodKey ?? null,
        displayPeriodKey: parsed.data.displayPeriodKey,
      },
    });

    return noStoreJson({
      ok: true,
      report: {
        id: updated.id,
        periodKey: updated.periodKey ?? null,
        status: updated.status,
        payload: updated.reportPayload,
        layoutDsl: updated.layoutDsl,
        exportAudit: updated.exportAudit,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "레포트 표기 연월 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    );
    return noStoreJson(
      {
        ok: false,
        code: dbError.code,
        error: dbError.message,
      },
      dbError.status
    );
  }
}
