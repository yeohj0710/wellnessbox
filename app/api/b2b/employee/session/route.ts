import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { resolveB2bEmployeeIdentity } from "@/lib/b2b/identity";
import {
  B2B_EMPLOYEE_TOKEN_COOKIE,
  buildB2bEmployeeAccessToken,
  getB2bEmployeeCookieOptions,
} from "@/lib/b2b/employee-token";
import { logB2bEmployeeAccess } from "@/lib/b2b/employee-service";
import {
  ensureLatestB2bReport,
  getLatestB2bReport,
} from "@/lib/b2b/report-service";
import { requireB2bEmployeeToken } from "@/lib/server/route-auth";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  birthDate: z.string().trim().regex(/^\d{8}$/),
  phone: z.string().trim().regex(/^\d{10,11}$/),
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const auth = await requireB2bEmployeeToken();
  if (!auth.ok) {
    return noStoreJson({ ok: true, authenticated: false });
  }

  const [employee, latestReport] = await Promise.all([
    db.b2bEmployee.findUnique({
      where: { id: auth.data.employeeId },
      select: {
        id: true,
        name: true,
        birthDate: true,
        phoneNormalized: true,
        updatedAt: true,
        lastSyncedAt: true,
      },
    }),
    getLatestB2bReport(auth.data.employeeId),
  ]);

  if (!employee) {
    return noStoreJson({ ok: true, authenticated: false });
  }

  await db.b2bEmployee.update({
    where: { id: employee.id },
    data: { lastViewedAt: new Date() },
  });

  await logB2bEmployeeAccess({
    employeeId: employee.id,
    action: "session_status",
    route: "/api/b2b/employee/session",
    payload: {
      reportId: latestReport?.id ?? null,
    },
  });

  return noStoreJson({
    ok: true,
    authenticated: true,
    employee: {
      id: employee.id,
      name: employee.name,
      birthDate: employee.birthDate,
      phoneNormalized: employee.phoneNormalized,
      lastSyncedAt: employee.lastSyncedAt?.toISOString() ?? null,
      updatedAt: employee.updatedAt.toISOString(),
    },
    latestReport: latestReport
      ? {
          id: latestReport.id,
          variantIndex: latestReport.variantIndex,
          status: latestReport.status,
          updatedAt: latestReport.updatedAt.toISOString(),
        }
      : null,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson(
      { ok: false, error: parsed.error.issues[0]?.message || "입력값을 확인해 주세요." },
      400
    );
  }

  const identity = resolveB2bEmployeeIdentity(parsed.data);
  const employee = await db.b2bEmployee.findUnique({
    where: { identityHash: identity.identityHash },
    select: {
      id: true,
      identityHash: true,
      name: true,
      appUserId: true,
    },
  });

  await logB2bEmployeeAccess({
    employeeId: employee?.id ?? null,
    appUserId: employee?.appUserId ?? null,
    action: "session_login_attempt",
    route: "/api/b2b/employee/session",
    payload: {
      found: !!employee,
    },
  });

  if (!employee) {
    return noStoreJson({
      ok: true,
      found: false,
      message: "기존 리포트가 없어 인증 연동이 필요합니다.",
    });
  }

  const report = await ensureLatestB2bReport(employee.id);
  const token = buildB2bEmployeeAccessToken({
    employeeId: employee.id,
    identityHash: employee.identityHash,
  });
  const response = noStoreJson({
    ok: true,
    found: true,
    employee: {
      id: employee.id,
      name: employee.name,
    },
    report: {
      id: report.id,
      variantIndex: report.variantIndex,
      status: report.status,
    },
  });
  response.cookies.set(
    B2B_EMPLOYEE_TOKEN_COOKIE,
    token,
    getB2bEmployeeCookieOptions()
  );

  await db.b2bEmployee.update({
    where: { id: employee.id },
    data: { lastViewedAt: new Date() },
  });

  await logB2bEmployeeAccess({
    employeeId: employee.id,
    appUserId: employee.appUserId ?? null,
    action: "session_login_success",
    route: "/api/b2b/employee/session",
    payload: { reportId: report.id },
  });

  return response;
}

export async function DELETE() {
  const response = noStoreJson({ ok: true, cleared: true });
  response.cookies.delete(B2B_EMPLOYEE_TOKEN_COOKIE);
  return response;
}
