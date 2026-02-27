import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import {
  ensureLatestB2bReport,
  listB2bReportPeriods,
  regenerateB2bReport,
} from "@/lib/b2b/report-service";
import {
  serializeB2bReportDetail,
  serializeB2bReportListItem,
} from "@/lib/b2b/report-route-serializers";
import type { AdminReportPostInput } from "@/lib/b2b/report-route-schema";

export async function loadAdminReportLookup(
  employeeId: string,
  requestedPeriodKey: string | null
) {
  const periodKey = requestedPeriodKey || resolveCurrentPeriodKey();
  const [latest, reports, availablePeriods] = await Promise.all([
    ensureLatestB2bReport(employeeId, periodKey),
    db.b2bReport.findMany({
      where: { employeeId },
      orderBy: [{ periodKey: "desc" }, { variantIndex: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
    listB2bReportPeriods(employeeId),
  ]);

  return {
    latest: serializeB2bReportDetail(latest, periodKey, {
      includeStylePreset: true,
    }),
    reports: reports.map((report) => serializeB2bReportListItem(report)),
    availablePeriods,
    periodKey: latest.periodKey ?? periodKey,
  };
}

export async function runAdminReportMutation(input: {
  employeeId: string;
  payload: AdminReportPostInput;
}) {
  const periodKey = input.payload.periodKey ?? resolveCurrentPeriodKey();
  const report = input.payload.regenerate
    ? await regenerateB2bReport({
        employeeId: input.employeeId,
        pageSize: input.payload.pageSize ?? "A4",
        periodKey,
        recomputeAnalysis: input.payload.recomputeAnalysis,
        generateAiEvaluation: input.payload.generateAiEvaluation,
      })
    : await ensureLatestB2bReport(input.employeeId, periodKey);

  await logB2bAdminAction({
    employeeId: input.employeeId,
    action: input.payload.regenerate ? "report_regenerate" : "report_ensure",
    actorTag: "admin",
    payload: {
      reportId: report.id,
      variantIndex: report.variantIndex,
      periodKey: report.periodKey ?? periodKey,
      recomputeAnalysis: input.payload.recomputeAnalysis === true,
      generateAiEvaluation: input.payload.generateAiEvaluation === true,
    },
  });

  return {
    report: serializeB2bReportDetail(report, periodKey, {
      includeStylePreset: true,
    }),
  };
}
