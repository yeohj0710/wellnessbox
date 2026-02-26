import "server-only";

import db from "@/lib/db";
import { computeAndSaveB2bAnalysis } from "@/lib/b2b/analysis-service";
import { buildB2bReportPayload } from "@/lib/b2b/report-payload";
import type { B2bReportPayload } from "@/lib/b2b/report-payload";
import {
  LAYOUT_TEMPLATE_VERSION,
  pickStylePreset,
} from "@/lib/b2b/export/layout-dsl";
import {
  runB2bExportPipeline,
  runB2bLayoutPipeline,
} from "@/lib/b2b/export/pipeline";
import { periodKeyToCycle, resolveCurrentPeriodKey } from "@/lib/b2b/period";
import type {
  LayoutDocument,
  PageSizeKey,
  StylePreset,
} from "@/lib/b2b/export/layout-types";

const MIN_REPORT_HISTORY_PER_PERIOD = 1;
const MAX_REPORT_HISTORY_PER_PERIOD = 20;
const DEFAULT_REPORT_HISTORY_PER_PERIOD = 5;

function asJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function parseStoredLayout(raw: unknown): LayoutDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const layout = raw as LayoutDocument;
  if (!Array.isArray(layout.pages) || layout.pages.length === 0) return null;
  if (!layout.pageSizeMm || typeof layout.pageSizeMm.width !== "number") return null;
  if (typeof layout.pageSizeMm.height !== "number") return null;
  return layout;
}

function isCurrentLayoutVersion(layout: LayoutDocument | null) {
  if (!layout) return false;
  return layout.layoutVersion === LAYOUT_TEMPLATE_VERSION;
}

function resolveReportHistoryPerPeriodLimit() {
  const raw = Number(process.env.B2B_REPORT_HISTORY_PER_PERIOD);
  if (!Number.isFinite(raw)) return DEFAULT_REPORT_HISTORY_PER_PERIOD;
  const rounded = Math.round(raw);
  return Math.min(
    MAX_REPORT_HISTORY_PER_PERIOD,
    Math.max(MIN_REPORT_HISTORY_PER_PERIOD, rounded)
  );
}

async function trimOldReportsForEmployeePeriod(
  employeeId: string,
  periodKey: string | null | undefined
) {
  const limit = resolveReportHistoryPerPeriodLimit();
  const where = periodKey ? { employeeId, periodKey } : { employeeId, periodKey: null };
  const rows = await db.b2bReport.findMany({
    where,
    orderBy: [{ variantIndex: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  if (rows.length <= limit) return;

  const removeIds = rows.slice(limit).map((row) => row.id);
  if (removeIds.length === 0) return;

  await db.b2bReport.deleteMany({
    where: { id: { in: removeIds } },
  });
}

async function refreshReportLayoutIfNeeded(report: Awaited<ReturnType<typeof getLatestB2bReport>>) {
  if (!report) return report;
  const storedLayout = parseStoredLayout(report.layoutDsl);
  if (isCurrentLayoutVersion(storedLayout)) return report;

  try {
    const payloadRaw = JSON.parse(JSON.stringify(report.reportPayload ?? null));
    if (!payloadRaw || typeof payloadRaw !== "object") return report;
    const payload = payloadRaw as B2bReportPayload;
    const pageSize = (report.pageSize || "A4") as PageSizeKey;
    const stylePreset = (report.stylePreset ||
      pickStylePreset(report.variantIndex)) as StylePreset;

    const refreshed = await runB2bLayoutPipeline({
      payload,
      intent: "export",
      pageSize,
      variantIndex: report.variantIndex,
      stylePreset,
    });

    if (!refreshed.ok) return report;

    return db.b2bReport.update({
      where: { id: report.id },
      data: {
        status: "ready",
        layoutDsl: asJsonValue(refreshed.layout),
        exportAudit: asJsonValue(refreshed.audit),
      },
    });
  } catch (error) {
    console.error("[b2b][report] layout refresh skipped", {
      reportId: report.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return report;
  }
}

async function hasNewerSourceData(input: {
  employeeId: string;
  periodKey: string;
  reportUpdatedAt: Date;
}) {
  const [latestAnalysis, latestSurvey, latestHealth, latestNote] = await Promise.all([
    db.b2bAnalysisResult.findFirst({
      where: { employeeId: input.employeeId, periodKey: input.periodKey },
      orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
      select: { updatedAt: true },
    }),
    db.b2bSurveyResponse.findFirst({
      where: { employeeId: input.employeeId, periodKey: input.periodKey },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.b2bHealthDataSnapshot.findFirst({
      where: { employeeId: input.employeeId, periodKey: input.periodKey },
      orderBy: { fetchedAt: "desc" },
      select: { fetchedAt: true },
    }),
    db.b2bPharmacistNote.findFirst({
      where: { employeeId: input.employeeId, periodKey: input.periodKey },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const reportTime = input.reportUpdatedAt.getTime();
  const latestTimes = [
    latestAnalysis?.updatedAt?.getTime() ?? 0,
    latestSurvey?.updatedAt?.getTime() ?? 0,
    latestHealth?.fetchedAt?.getTime() ?? 0,
    latestNote?.updatedAt?.getTime() ?? 0,
  ];
  return latestTimes.some((value) => value > reportTime);
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
    intent: "export",
    pageSize,
    variantIndex,
    stylePreset,
  });

  const status = previewLayoutResult.ok ? "ready" : "validation_failed";
  const layoutDsl = previewLayoutResult.ok ? previewLayoutResult.layout : null;
  const exportAudit = previewLayoutResult.audit;

  const created = await db.b2bReport.create({
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

  await trimOldReportsForEmployeePeriod(input.employeeId, periodKey);
  return created;
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
  if (latest) {
    const stale = await hasNewerSourceData({
      employeeId,
      periodKey: targetPeriod,
      reportUpdatedAt: latest.updatedAt,
    });
    if (stale) {
      return createB2bReportSnapshot({
        employeeId,
        periodKey: targetPeriod,
        recomputeAnalysis: true,
      });
    }
    const refreshed = await refreshReportLayoutIfNeeded(latest);
    if (refreshed) return refreshed;
  }
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
  const layoutOverride = parseStoredLayout(report.layoutDsl);

  const result = await runB2bExportPipeline({
    payload,
    pageSize,
    variantIndex: report.variantIndex,
    stylePreset,
    layoutOverride,
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
