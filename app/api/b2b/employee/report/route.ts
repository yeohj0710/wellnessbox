import { NextResponse } from "next/server";
import db from "@/lib/db";
import { ensureLatestB2bReport } from "@/lib/b2b/report-service";
import { logB2bEmployeeAccess } from "@/lib/b2b/employee-service";
import { requireB2bEmployeeToken } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request) {
  const auth = await requireB2bEmployeeToken();
  if (!auth.ok) return auth.response;

  const report = await ensureLatestB2bReport(auth.data.employeeId);
  const employee = await db.b2bEmployee.findUnique({
    where: { id: auth.data.employeeId },
    select: {
      id: true,
      name: true,
      lastSyncedAt: true,
    },
  });

  if (!employee) {
    return noStoreJson({ ok: false, error: "임직원 정보를 찾을 수 없습니다." }, 404);
  }

  await db.b2bEmployee.update({
    where: { id: employee.id },
    data: { lastViewedAt: new Date() },
  });

  await logB2bEmployeeAccess({
    employeeId: employee.id,
    action: "report_view",
    route: "/api/b2b/employee/report",
    payload: { reportId: report.id },
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
    report: {
      id: report.id,
      variantIndex: report.variantIndex,
      status: report.status,
      pageSize: report.pageSize,
      payload: report.reportPayload,
      updatedAt: report.updatedAt.toISOString(),
    },
  });
}
