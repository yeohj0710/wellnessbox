import db from "@/lib/db";
import { NextResponse } from "next/server";
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
import {
  serializeB2bReportCompact,
  serializeB2bReportStatus,
} from "@/lib/b2b/report-route-serializers";

export { noStoreJson } from "@/lib/server/no-store";

export const B2B_EMPLOYEE_SESSION_ROUTE = "/api/b2b/employee/session";
export const B2B_EMPLOYEE_LOGIN_NOT_FOUND_MESSAGE =
  "기존 리포트가 없어 인증 연동이 필요합니다.";

export type EmployeeSessionStatusResult =
  | { authenticated: false }
  | {
      authenticated: true;
      employee: {
        id: string;
        name: string;
        birthDate: string;
        phoneNormalized: string;
        lastSyncedAt: string | null;
        updatedAt: string;
      };
      latestReport: ReturnType<typeof serializeB2bReportStatus> | null;
    };

export type EmployeeSessionLoginResult =
  | {
      found: false;
      message: string;
    }
  | {
      found: true;
      employee: {
        id: string;
        name: string;
      };
      report: ReturnType<typeof serializeB2bReportCompact>;
      token: {
        employeeId: string;
        identityHash: string;
      };
    };

export function attachB2bEmployeeSessionToken(
  response: NextResponse,
  employeeId: string,
  identityHash: string
) {
  const token = buildB2bEmployeeAccessToken({
    employeeId,
    identityHash,
  });
  response.cookies.set(
    B2B_EMPLOYEE_TOKEN_COOKIE,
    token,
    getB2bEmployeeCookieOptions()
  );
  return response;
}

export async function logB2bEmployeeSessionAccess(input: {
  employeeId?: string | null;
  appUserId?: string | null;
  action: string;
  payload?: unknown;
}) {
  await logB2bEmployeeAccess({
    employeeId: input.employeeId ?? null,
    appUserId: input.appUserId ?? null,
    action: input.action,
    route: B2B_EMPLOYEE_SESSION_ROUTE,
    payload: input.payload,
  });
}

export async function resolveEmployeeSessionStatus(
  employeeId: string
): Promise<EmployeeSessionStatusResult> {
  const [employee, latestReport] = await Promise.all([
    db.b2bEmployee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        birthDate: true,
        phoneNormalized: true,
        updatedAt: true,
        lastSyncedAt: true,
      },
    }),
    getLatestB2bReport(employeeId),
  ]);

  if (!employee) {
    return { authenticated: false };
  }

  await Promise.all([
    db.b2bEmployee.update({
      where: { id: employee.id },
      data: { lastViewedAt: new Date() },
    }),
    logB2bEmployeeSessionAccess({
      employeeId: employee.id,
      action: "session_status",
      payload: {
        reportId: latestReport?.id ?? null,
      },
    }),
  ]);

  return {
    authenticated: true,
    employee: {
      id: employee.id,
      name: employee.name,
      birthDate: employee.birthDate,
      phoneNormalized: employee.phoneNormalized,
      lastSyncedAt: employee.lastSyncedAt?.toISOString() ?? null,
      updatedAt: employee.updatedAt.toISOString(),
    },
    latestReport: latestReport ? serializeB2bReportStatus(latestReport) : null,
  };
}

export async function resolveEmployeeSessionLogin(
  identityHash: string
): Promise<EmployeeSessionLoginResult> {
  const employee = await db.b2bEmployee.findUnique({
    where: { identityHash },
    select: {
      id: true,
      identityHash: true,
      name: true,
      appUserId: true,
    },
  });

  await logB2bEmployeeSessionAccess({
    employeeId: employee?.id ?? null,
    appUserId: employee?.appUserId ?? null,
    action: "session_login_attempt",
    payload: {
      found: !!employee,
    },
  });

  if (!employee) {
    return {
      found: false,
      message: B2B_EMPLOYEE_LOGIN_NOT_FOUND_MESSAGE,
    };
  }

  const report = await ensureLatestB2bReport(employee.id);

  await Promise.all([
    db.b2bEmployee.update({
      where: { id: employee.id },
      data: { lastViewedAt: new Date() },
    }),
    logB2bEmployeeSessionAccess({
      employeeId: employee.id,
      appUserId: employee.appUserId ?? null,
      action: "session_login_success",
      payload: { reportId: report.id },
    }),
  ]);

  return {
    found: true,
    employee: {
      id: employee.id,
      name: employee.name,
    },
    report: serializeB2bReportCompact(report),
    token: {
      employeeId: employee.id,
      identityHash: employee.identityHash,
    },
  };
}
