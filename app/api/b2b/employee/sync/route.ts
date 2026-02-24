import { NextResponse } from "next/server";
import { z } from "zod";
import {
  B2B_EMPLOYEE_TOKEN_COOKIE,
  buildB2bEmployeeAccessToken,
  getB2bEmployeeCookieOptions,
} from "@/lib/b2b/employee-token";
import {
  fetchAndStoreB2bHealthSnapshot,
  logB2bEmployeeAccess,
  upsertB2bEmployee,
} from "@/lib/b2b/employee-service";
import { regenerateB2bReport } from "@/lib/b2b/report-service";
import { requireNhisSession } from "@/lib/server/route-auth";

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

function readClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

export async function POST(req: Request) {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson(
      { ok: false, error: parsed.error.issues[0]?.message || "입력값을 확인해 주세요." },
      400
    );
  }

  const ip = readClientIp(req);
  const userAgent = req.headers.get("user-agent");

  const upserted = await upsertB2bEmployee({
    appUserId: auth.data.appUserId,
    name: parsed.data.name,
    birthDate: parsed.data.birthDate,
    phone: parsed.data.phone,
  });

  await logB2bEmployeeAccess({
    employeeId: upserted.employee.id,
    appUserId: auth.data.appUserId,
    action: "sync_start",
    route: "/api/b2b/employee/sync",
    ip,
    userAgent,
    payload: { guest: auth.data.guest },
  });

  try {
    const syncResult = await fetchAndStoreB2bHealthSnapshot({
      appUserId: auth.data.appUserId,
      employeeId: upserted.employee.id,
      identity: upserted.identity,
    });

    const report = await regenerateB2bReport({
      employeeId: upserted.employee.id,
      pageSize: "A4",
    });

    const token = buildB2bEmployeeAccessToken({
      employeeId: upserted.employee.id,
      identityHash: upserted.identity.identityHash,
    });

    const response = noStoreJson({
      ok: true,
      employee: {
        id: upserted.employee.id,
        name: upserted.employee.name,
      },
      sync: {
        source: syncResult.source,
        snapshotId: syncResult.snapshot.id,
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

    await logB2bEmployeeAccess({
      employeeId: upserted.employee.id,
      appUserId: auth.data.appUserId,
      action: "sync_success",
      route: "/api/b2b/employee/sync",
      ip,
      userAgent,
      payload: {
        reportId: report.id,
        source: syncResult.source,
      },
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "건강 데이터 동기화에 실패했습니다.";

    await logB2bEmployeeAccess({
      employeeId: upserted.employee.id,
      appUserId: auth.data.appUserId,
      action: "sync_failed",
      route: "/api/b2b/employee/sync",
      ip,
      userAgent,
      payload: {
        error: message,
      },
    });

    return noStoreJson({ ok: false, error: message }, 502);
  }
}
