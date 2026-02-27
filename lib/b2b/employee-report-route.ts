import "server-only";

import db from "@/lib/db";
import { logB2bEmployeeAccess } from "@/lib/b2b/employee-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { serializeB2bReportDetail } from "@/lib/b2b/report-route-serializers";
import {
  ensureLatestB2bReport,
  listB2bReportPeriods,
} from "@/lib/b2b/report-service";
import { noStoreJson } from "@/lib/server/no-store";
import { requireB2bEmployeeToken } from "@/lib/server/route-auth";

const B2B_EMPLOYEE_NOT_FOUND_ERROR =
  "\uC9C1\uC6D0 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";

export async function runB2bEmployeeReportGetRoute(req: Request) {
  const auth = await requireB2bEmployeeToken();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const periodKey = searchParams.get("period") || resolveCurrentPeriodKey();

  const [report, availablePeriods] = await Promise.all([
    ensureLatestB2bReport(auth.data.employeeId, periodKey),
    listB2bReportPeriods(auth.data.employeeId),
  ]);

  const employee = await db.b2bEmployee.findUnique({
    where: { id: auth.data.employeeId },
    select: {
      id: true,
      name: true,
      lastSyncedAt: true,
    },
  });
  if (!employee) {
    return noStoreJson({ ok: false, error: B2B_EMPLOYEE_NOT_FOUND_ERROR }, 404);
  }

  await db.b2bEmployee.update({
    where: { id: employee.id },
    data: { lastViewedAt: new Date() },
  });

  await logB2bEmployeeAccess({
    employeeId: employee.id,
    action: "report_view",
    route: "/api/b2b/employee/report",
    payload: { reportId: report.id, periodKey: report.periodKey ?? periodKey },
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return noStoreJson({
    ok: true,
    employee: {
      id: employee.id,
      name: employee.name,
      lastSyncedAt: employee.lastSyncedAt?.toISOString() ?? null,
    },
    report: serializeB2bReportDetail(report, periodKey),
    periodKey: report.periodKey ?? periodKey,
    availablePeriods,
  });
}
