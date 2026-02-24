import "server-only";

import db from "@/lib/db";
import { buildB2bReportPayload } from "@/lib/b2b/report-payload";
import {
  generateLayoutFromPayload,
  pickStylePreset,
  type PageSizeKey,
  type StylePreset,
} from "@/lib/b2b/export/layout-dsl";
import { runB2bExportPipeline } from "@/lib/b2b/export/pipeline";

function asJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function getNextB2bReportVariantIndex(employeeId: string) {
  const latest = await db.b2bReport.findFirst({
    where: { employeeId },
    orderBy: { variantIndex: "desc" },
    select: { variantIndex: true },
  });
  return (latest?.variantIndex ?? 0) + 1;
}

export async function createB2bReportSnapshot(input: {
  employeeId: string;
  pageSize?: PageSizeKey;
  variantIndex?: number;
  stylePreset?: StylePreset;
}) {
  const pageSize = input.pageSize ?? "A4";
  const variantIndex =
    input.variantIndex ?? (await getNextB2bReportVariantIndex(input.employeeId));
  const stylePreset = input.stylePreset ?? pickStylePreset(variantIndex);
  const payload = await buildB2bReportPayload({
    employeeId: input.employeeId,
    variantIndex,
    stylePreset,
  });
  const layout = generateLayoutFromPayload({
    payload,
    intent: "preview",
    pageSize,
    variantIndex,
    stylePreset,
  });

  return db.b2bReport.create({
    data: {
      employeeId: input.employeeId,
      variantIndex,
      status: "ready",
      pageSize,
      stylePreset,
      reportPayload: asJsonValue(payload),
      layoutDsl: asJsonValue(layout),
    },
  });
}

export async function getLatestB2bReport(employeeId: string) {
  return db.b2bReport.findFirst({
    where: { employeeId },
    orderBy: [{ variantIndex: "desc" }, { createdAt: "desc" }],
  });
}

export async function ensureLatestB2bReport(employeeId: string) {
  const latest = await getLatestB2bReport(employeeId);
  if (latest) return latest;
  return createB2bReportSnapshot({ employeeId });
}

export async function regenerateB2bReport(input: {
  employeeId: string;
  pageSize?: PageSizeKey;
}) {
  return createB2bReportSnapshot({
    employeeId: input.employeeId,
    pageSize: input.pageSize ?? "A4",
  });
}

export async function runB2bReportExport(reportId: string) {
  const report = await db.b2bReport.findUnique({
    where: { id: reportId },
  });
  if (!report) {
    throw new Error("레포트를 찾을 수 없습니다.");
  }

  const pageSize = (report.pageSize || "A4") as PageSizeKey;
  const stylePreset = (report.stylePreset || pickStylePreset(report.variantIndex)) as StylePreset;
  const payload = JSON.parse(JSON.stringify(report.reportPayload));

  const result = await runB2bExportPipeline({
    payload,
    pageSize,
    variantIndex: report.variantIndex,
    stylePreset,
  });

  if (!result.ok) {
    await db.b2bReport.update({
      where: { id: reportId },
      data: {
        status: "validation_failed",
        exportAudit: asJsonValue(result.audit),
      },
    });
    return result;
  }

  await db.b2bReport.update({
    where: { id: reportId },
    data: {
      status: "export_ready",
      layoutDsl: asJsonValue(result.layout),
      exportAudit: asJsonValue(result.audit),
    },
  });

  return result;
}
