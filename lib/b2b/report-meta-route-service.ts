import { randomUUID } from "crypto";
import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { pickStylePreset } from "@/lib/b2b/export/layout-dsl";
import { runB2bLayoutPipeline } from "@/lib/b2b/export/pipeline";
import type { PageSizeKey, StylePreset } from "@/lib/b2b/export/layout-types";
import type { B2bReportPayload } from "@/lib/b2b/report-payload";
import {
  applyReportCustomizationToPayload,
  extractReportCustomization,
  normalizeReportCustomization,
} from "@/lib/b2b/report-customization";
import type { B2bReportPackagedProduct } from "@/lib/b2b/report-customization-types";

type ReportMetaRouteReport = {
  id: string;
  employeeId: string;
  variantIndex: number;
  pageSize: string | null;
  stylePreset: string | null;
  reportPayload: unknown;
  periodKey?: string | null;
};

type UpdateReportMetaFailure = {
  ok: false;
  status: number;
  payload: Record<string, unknown>;
};

type UpdateReportMetaSuccess = {
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

type UpdateReportMetaResult = UpdateReportMetaFailure | UpdateReportMetaSuccess;

function asJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function toReportPayload(raw: unknown): B2bReportPayload | null {
  if (!raw || typeof raw !== "object") return null;
  return asJsonValue(raw) as B2bReportPayload;
}

export async function updateReportMeta(input: {
  report: ReportMetaRouteReport;
  displayPeriodKey?: string;
  consultationSummary?: string;
  packagedProducts?: Array<Partial<B2bReportPackagedProduct>>;
}): Promise<UpdateReportMetaResult> {
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

  const currentCustomization = extractReportCustomization(payload);
  const nextCustomization = normalizeReportCustomization({
    displayPeriodKey:
      input.displayPeriodKey ?? currentCustomization.displayPeriodKey ?? payload.meta?.periodKey,
    consultationSummary:
      input.consultationSummary ?? currentCustomization.consultationSummary,
    packagedProducts: input.packagedProducts ?? currentCustomization.packagedProducts,
  });
  const nextPayload = applyReportCustomizationToPayload(payload, nextCustomization);
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
        error: "레포트 내용을 반영하는 중 레이아웃 검증에 실패했습니다.",
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
    action: "report_meta_update",
    actorTag: "admin",
    payload: {
      reportId: updated.id,
      periodKey: updated.periodKey ?? null,
      displayPeriodKey: nextCustomization.displayPeriodKey ?? null,
      hasConsultationSummary: Boolean(nextCustomization.consultationSummary),
      packagedProductCount: nextCustomization.packagedProducts?.length ?? 0,
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
