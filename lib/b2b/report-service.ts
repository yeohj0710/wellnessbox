import "server-only";

import db from "@/lib/db";
import { computeAndSaveB2bAnalysis } from "@/lib/b2b/analysis-service";
import { buildB2bReportPayload } from "@/lib/b2b/report-payload";
import { pickStylePreset } from "@/lib/b2b/export/layout-dsl";
import {
  runB2bExportPipeline,
  runB2bLayoutPipeline,
} from "@/lib/b2b/export/pipeline";
import { periodKeyToCycle, resolveCurrentPeriodKey } from "@/lib/b2b/period";
import type { PageSizeKey, StylePreset } from "@/lib/b2b/export/layout-types";

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
  periodKey?: string | null;
  variantIndex?: number;
  stylePreset?: StylePreset;
  recomputeAnalysis?: boolean;
  generateAiEvaluation?: boolean;
}) {
  const pageSize = input.pageSize ?? "A4";
  const periodKey = input.periodKey ?? resolveCurrentPeriodKey();
  const reportCycle = periodKeyToCycle(periodKey);
  const variantIndex =
    input.variantIndex ?? (await getNextB2bReportVariantIndex(input.employeeId));
  const stylePreset = input.stylePreset ?? pickStylePreset(variantIndex);

  const latestPeriodAnalysis = await db.b2bAnalysisResult.findFirst({
    where: { employeeId: input.employeeId, periodKey },
    orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
    select: { id: true },
  });
  if (input.recomputeAnalysis || !latestPeriodAnalysis) {
    await computeAndSaveB2bAnalysis({
      employeeId: input.employeeId,
      periodKey,
      replaceLatestPeriodEntry: true,
      generateAiEvaluation: input.generateAiEvaluation,
    });
  }

  const payload = await buildB2bReportPayload({
    employeeId: input.employeeId,
    periodKey,
    variantIndex,
    stylePreset,
  });
  const previewLayoutResult = await runB2bLayoutPipeline({
    payload,
    intent: "preview",
    pageSize,
    variantIndex,
    stylePreset,
  });

  const status = previewLayoutResult.ok ? "ready" : "validation_failed";
  const layoutDsl = previewLayoutResult.ok ? previewLayoutResult.layout : null;
  const exportAudit = previewLayoutResult.audit;

  return db.b2bReport.create({
    data: {
      employeeId: input.employeeId,
      variantIndex,
      status,
      pageSize,
      stylePreset,
      reportPayload: asJsonValue(payload),
      layoutDsl: asJsonValue(layoutDsl),
      exportAudit: asJsonValue(exportAudit),
      periodKey,
      reportCycle: reportCycle ?? null,
    },
  });
}

export async function getLatestB2bReport(employeeId: string, periodKey?: string | null) {
  return db.b2bReport.findFirst({
    where: {
      employeeId,
      ...(periodKey ? { periodKey } : {}),
    },
    orderBy: [{ variantIndex: "desc" }, { createdAt: "desc" }],
  });
}

export async function ensureLatestB2bReport(employeeId: string, periodKey?: string | null) {
  const targetPeriod = periodKey ?? resolveCurrentPeriodKey();
  const latest = await getLatestB2bReport(employeeId, targetPeriod);
  if (latest) return latest;
  return createB2bReportSnapshot({ employeeId, periodKey: targetPeriod });
}

export async function regenerateB2bReport(input: {
  employeeId: string;
  pageSize?: PageSizeKey;
  periodKey?: string | null;
  recomputeAnalysis?: boolean;
  generateAiEvaluation?: boolean;
}) {
  return createB2bReportSnapshot({
    employeeId: input.employeeId,
    pageSize: input.pageSize ?? "A4",
    periodKey: input.periodKey ?? resolveCurrentPeriodKey(),
    recomputeAnalysis: input.recomputeAnalysis,
    generateAiEvaluation: input.generateAiEvaluation,
  });
}

export async function listB2bReportPeriods(employeeId: string) {
  const rows = await db.b2bReport.findMany({
    where: { employeeId, periodKey: { not: null } },
    orderBy: [{ periodKey: "desc" }, { createdAt: "desc" }],
    select: { periodKey: true },
    take: 24,
  });
  const set = new Set<string>();
  for (const row of rows) {
    if (row.periodKey) set.add(row.periodKey);
  }
  return [...set];
}

export async function runB2bReportExport(reportId: string) {
  const report = await db.b2bReport.findUnique({
    where: { id: reportId },
  });
  if (!report) {
    throw new Error("리포트를 찾을 수 없습니다.");
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
