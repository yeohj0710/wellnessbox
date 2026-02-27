import { randomUUID } from "crypto";
import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { pickStylePreset } from "@/lib/b2b/export/layout-dsl";
import { runB2bLayoutPipeline } from "@/lib/b2b/export/pipeline";
import type { PageSizeKey, StylePreset } from "@/lib/b2b/export/layout-types";
import type { B2bReportPayload } from "@/lib/b2b/report-payload";

type ReportMetaRouteReport = {
  id: string;
  employeeId: string;
  variantIndex: number;
  pageSize: string | null;
  stylePreset: string | null;
  reportPayload: unknown;
  periodKey?: string | null;
};

type UpdateDisplayPeriodFailure = {
  ok: false;
  status: number;
  payload: Record<string, unknown>;
};

type UpdateDisplayPeriodSuccess = {
  ok: true;
  report: {
    id: string;
    periodKey: string | null;
    status: string;
    payload: unknown;
    layoutDsl: unknown;
    exportAudit: unknown;
    updatedAt: string;
  };
};

type UpdateDisplayPeriodResult =
  | UpdateDisplayPeriodFailure
  | UpdateDisplayPeriodSuccess;

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

export async function updateReportDisplayPeriod(input: {
  report: ReportMetaRouteReport;
  displayPeriodKey: string;
}): Promise<UpdateDisplayPeriodResult> {
  const payload = toReportPayload(input.report.reportPayload);
  if (!payload) {
    return {
      ok: false,
      status: 400,
      payload: {
        ok: false,
        error: "리포트 본문 데이터를 읽을 수 없습니다.",
      },
    };
  }

  const nextPayload = withDisplayPeriod(payload, input.displayPeriodKey);
  const pageSize = (input.report.pageSize || "A4") as PageSizeKey;
  const stylePreset = (input.report.stylePreset ||
    pickStylePreset(input.report.variantIndex)) as StylePreset;
  const layoutResult = await runB2bLayoutPipeline({
    payload: nextPayload,
    intent: "export",
    pageSize,
    variantIndex: input.report.variantIndex,
    stylePreset,
  });

  if (!layoutResult.ok) {
    const debugId = randomUUID();
    return {
      ok: false,
      status: 400,
      payload: {
        ok: false,
        code: "LAYOUT_VALIDATION_FAILED",
        reason: "layout_validation_failed",
        debugId,
        error: "표시 연월 반영 중 레이아웃 검증에 실패했습니다.",
        audit: layoutResult.audit,
        issues: layoutResult.issues,
      },
    };
  }

  const updated = await db.b2bReport.update({
    where: { id: input.report.id },
    data: {
      status: "ready",
      reportPayload: asJsonValue(nextPayload),
      layoutDsl: asJsonValue(layoutResult.layout),
      exportAudit: asJsonValue(layoutResult.audit),
    },
  });

  await logB2bAdminAction({
    employeeId: input.report.employeeId,
    action: "report_display_period_update",
    actorTag: "admin",
    payload: {
      reportId: updated.id,
      periodKey: updated.periodKey ?? null,
      displayPeriodKey: input.displayPeriodKey,
    },
  });

  return {
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
  };
}
