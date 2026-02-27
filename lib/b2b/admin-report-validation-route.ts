import { randomUUID } from "crypto";
import db from "@/lib/db";
import { runB2bLayoutPipeline } from "@/lib/b2b/export/pipeline";
import type { PageSizeKey, StylePreset } from "@/lib/b2b/export/layout-types";
import {
  requireAdminReport,
  type B2bReportRouteContext,
} from "@/lib/b2b/admin-report-route";
import { buildDbErrorResponse } from "@/lib/b2b/route-helpers";
import { noStoreJson } from "@/lib/server/no-store";

type ReportValidationRouteReport = {
  id: string;
  variantIndex: number;
  pageSize: string | null;
  stylePreset: string | null;
  reportPayload: unknown;
};

export type { B2bReportRouteContext };

const VALIDATION_FAILED_ERROR =
  "\uB808\uC774\uC544\uC6C3 \uAC80\uC99D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

function asJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function resolveValidationInput(report: ReportValidationRouteReport) {
  return {
    pageSize: (report.pageSize || "A4") as PageSizeKey,
    stylePreset: (report.stylePreset || undefined) as StylePreset | undefined,
    payload: asJsonValue(report.reportPayload),
  };
}

export async function runAdminReportValidation(
  report: ReportValidationRouteReport
) {
  const validationInput = resolveValidationInput(report);
  const validationResult = await runB2bLayoutPipeline({
    payload: validationInput.payload,
    intent: "export",
    pageSize: validationInput.pageSize,
    variantIndex: report.variantIndex,
    stylePreset: validationInput.stylePreset,
  });

  await db.b2bReport.update({
    where: { id: report.id },
    data: {
      status: validationResult.ok ? "ready" : "validation_failed",
      layoutDsl: validationResult.ok
        ? asJsonValue(validationResult.layout)
        : null,
      exportAudit: asJsonValue(validationResult.audit),
    },
  });

  if (!validationResult.ok) {
    return noStoreJson({
      ok: false,
      code: "LAYOUT_VALIDATION_FAILED",
      reason: "layout_validation_failed",
      debugId: randomUUID(),
      audit: validationResult.audit,
      issues: validationResult.issues,
    });
  }

  return noStoreJson({
    ok: true,
    audit: validationResult.audit,
    layout: validationResult.layout,
    issues: [],
  });
}

export async function runAdminReportValidationGetRoute(
  ctx: B2bReportRouteContext
) {
  try {
    const reportResult = await requireAdminReport(ctx, (reportId) =>
      db.b2bReport.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          employeeId: true,
          variantIndex: true,
          pageSize: true,
          stylePreset: true,
          reportPayload: true,
        },
      })
    );
    if (!reportResult.ok) return reportResult.response;

    return runAdminReportValidation(reportResult.report);
  } catch (error) {
    return buildDbErrorResponse(error, VALIDATION_FAILED_ERROR);
  }
}
