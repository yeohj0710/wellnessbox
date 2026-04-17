import "server-only";

import db from "@/lib/db";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { resolveReportPayloadWithLatestNote } from "@/lib/b2b/report-render-payload";
import {
  serializeB2bReportDetail,
  serializeB2bReportListItem,
} from "@/lib/b2b/report-route-serializers";
import {
  ensureLatestB2bReport,
  listB2bReportPeriods,
} from "@/lib/b2b/report-service";
import { serializeEmployeeSyncState } from "@/lib/b2b/employee-background-sync";

type LoadEmployeeWorkspaceInput = {
  employeeId: string;
  reportId?: string | null;
  periodKey?: string | null;
};

async function loadSelectedReportPayload(input: {
  employeeId: string;
  report:
    | {
        id: string;
        variantIndex: number;
        status: string;
        pageSize: string;
        stylePreset: string | null;
        periodKey: string | null;
        reportCycle: number | null;
        reportPayload: unknown;
        layoutDsl: unknown;
        exportAudit: unknown;
        updatedAt: Date;
      }
    | null;
  fallbackPeriodKey: string;
}) {
  if (!input.report) return null;

  const payload =
    (await resolveReportPayloadWithLatestNote({
      employeeId: input.employeeId,
      periodKey: input.report.periodKey ?? input.fallbackPeriodKey,
      rawPayload: input.report.reportPayload,
    })) ?? input.report.reportPayload;

  return serializeB2bReportDetail(
    {
      ...input.report,
      reportPayload: payload,
    },
    input.fallbackPeriodKey,
    {
      includeStylePreset: true,
    }
  );
}

export async function loadEmployeeWorkspace(input: LoadEmployeeWorkspaceInput) {
  const currentPeriodKey = resolveCurrentPeriodKey();
  const requestedPeriodKey = input.periodKey || currentPeriodKey;

  const [
    employee,
    currentHealth,
    latestHealth,
    currentSurvey,
    latestSurvey,
    currentPeriodReport,
    latestOverallReport,
    syncState,
  ] = await Promise.all([
    db.b2bEmployee.findUnique({
      where: { id: input.employeeId },
      select: {
        id: true,
        name: true,
        appUserId: true,
        lastSyncedAt: true,
        lastViewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.b2bHealthDataSnapshot.findFirst({
      where: {
        employeeId: input.employeeId,
        periodKey: currentPeriodKey,
      },
      orderBy: [{ fetchedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        periodKey: true,
        fetchedAt: true,
      },
    }),
    db.b2bHealthDataSnapshot.findFirst({
      where: {
        employeeId: input.employeeId,
      },
      orderBy: [{ fetchedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        periodKey: true,
        fetchedAt: true,
      },
    }),
    db.b2bSurveyResponse.findFirst({
      where: {
        employeeId: input.employeeId,
        periodKey: currentPeriodKey,
        submittedAt: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        periodKey: true,
        submittedAt: true,
        updatedAt: true,
      },
    }),
    db.b2bSurveyResponse.findFirst({
      where: {
        employeeId: input.employeeId,
        submittedAt: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        periodKey: true,
        submittedAt: true,
        updatedAt: true,
      },
    }),
    db.b2bReport.findFirst({
      where: {
        employeeId: input.employeeId,
        periodKey: requestedPeriodKey,
      },
      orderBy: [{ variantIndex: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
      },
    }),
    db.b2bReport.findFirst({
      where: {
        employeeId: input.employeeId,
      },
      orderBy: [{ periodKey: "desc" }, { variantIndex: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
      },
    }),
    db.b2bEmployeeSyncState.findUnique({
      where: { employeeId: input.employeeId },
    }),
  ]);

  if (!employee) {
    return null;
  }

  const hasAnyWorkspaceData = Boolean(latestHealth || latestSurvey || latestOverallReport);
  let selectedReportRow:
    | {
        id: string;
        variantIndex: number;
        status: string;
        pageSize: string;
        stylePreset: string | null;
        periodKey: string | null;
        reportCycle: number | null;
        reportPayload: unknown;
        layoutDsl: unknown;
        exportAudit: unknown;
        updatedAt: Date;
      }
    | null = null;

  if (input.reportId) {
    const reportById = await db.b2bReport.findUnique({
      where: { id: input.reportId },
      select: {
        id: true,
        employeeId: true,
        variantIndex: true,
        status: true,
        pageSize: true,
        stylePreset: true,
        periodKey: true,
        reportCycle: true,
        reportPayload: true,
        layoutDsl: true,
        exportAudit: true,
        updatedAt: true,
      },
    });
    if (reportById?.employeeId === input.employeeId) {
      selectedReportRow = {
        id: reportById.id,
        variantIndex: reportById.variantIndex,
        status: reportById.status,
        pageSize: reportById.pageSize,
        stylePreset: reportById.stylePreset,
        periodKey: reportById.periodKey,
        reportCycle: reportById.reportCycle,
        reportPayload: reportById.reportPayload,
        layoutDsl: reportById.layoutDsl,
        exportAudit: reportById.exportAudit,
        updatedAt: reportById.updatedAt,
      };
    }
  }

  if (!selectedReportRow) {
    const shouldEnsureCurrentReport = Boolean(
      currentHealth || currentSurvey || currentPeriodReport
    );
    if (shouldEnsureCurrentReport) {
      const ensured = await ensureLatestB2bReport(input.employeeId, requestedPeriodKey);
      selectedReportRow = {
        id: ensured.id,
        variantIndex: ensured.variantIndex,
        status: ensured.status,
        pageSize: ensured.pageSize,
        stylePreset: ensured.stylePreset ?? null,
        periodKey: ensured.periodKey ?? requestedPeriodKey,
        reportCycle: ensured.reportCycle ?? null,
        reportPayload: ensured.reportPayload,
        layoutDsl: ensured.layoutDsl,
        exportAudit: ensured.exportAudit,
        updatedAt: ensured.updatedAt,
      };
    } else if (latestOverallReport) {
      const latest = await db.b2bReport.findUnique({
        where: { id: latestOverallReport.id },
        select: {
          id: true,
          variantIndex: true,
          status: true,
          pageSize: true,
          stylePreset: true,
          periodKey: true,
          reportCycle: true,
          reportPayload: true,
          layoutDsl: true,
          exportAudit: true,
          updatedAt: true,
        },
      });
      if (latest) {
        selectedReportRow = latest;
      }
    }
  }

  const [reports, availablePeriods, selectedReport] = await Promise.all([
    db.b2bReport.findMany({
      where: { employeeId: input.employeeId },
      orderBy: [{ periodKey: "desc" }, { variantIndex: "desc" }, { createdAt: "desc" }],
      take: 30,
      select: {
        id: true,
        variantIndex: true,
        status: true,
        pageSize: true,
        stylePreset: true,
        periodKey: true,
        reportCycle: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    listB2bReportPeriods(input.employeeId),
    loadSelectedReportPayload({
      employeeId: input.employeeId,
      report: selectedReportRow,
      fallbackPeriodKey: requestedPeriodKey,
    }),
  ]);

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      appUserId: employee.appUserId ?? null,
      lastSyncedAt: employee.lastSyncedAt?.toISOString() ?? null,
      lastViewedAt: employee.lastViewedAt?.toISOString() ?? null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    },
    currentPeriodKey,
    requestedPeriodKey,
    selectedReportId: selectedReport?.id ?? null,
    selectedPeriodKey:
      selectedReport?.periodKey ?? selectedReportRow?.periodKey ?? requestedPeriodKey,
    report: selectedReport,
    reports: reports.map((report) => serializeB2bReportListItem(report)),
    availablePeriods,
    sync: serializeEmployeeSyncState(syncState),
    currentStatus: {
      hasAnyWorkspaceData,
      health: {
        complete: Boolean(currentHealth),
        snapshotId: currentHealth?.id ?? null,
        fetchedAt: currentHealth?.fetchedAt?.toISOString() ?? null,
        latestSnapshotId: latestHealth?.id ?? null,
        latestFetchedAt: latestHealth?.fetchedAt?.toISOString() ?? null,
        latestPeriodKey: latestHealth?.periodKey ?? null,
      },
      survey: {
        complete: Boolean(currentSurvey),
        responseId: currentSurvey?.id ?? null,
        submittedAt: currentSurvey?.submittedAt?.toISOString() ?? null,
        updatedAt: currentSurvey?.updatedAt?.toISOString() ?? null,
        latestResponseId: latestSurvey?.id ?? null,
        latestSubmittedAt: latestSurvey?.submittedAt?.toISOString() ?? null,
        latestPeriodKey: latestSurvey?.periodKey ?? null,
      },
      report: {
        available: Boolean(selectedReport),
        reportId: selectedReport?.id ?? null,
        updatedAt: selectedReport?.updatedAt ?? null,
      },
      ready: Boolean(currentHealth && currentSurvey),
    },
  };
}
