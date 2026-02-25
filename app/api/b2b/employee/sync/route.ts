import { NextResponse } from "next/server";
import { z } from "zod";
import {
  B2B_EMPLOYEE_TOKEN_COOKIE,
  buildB2bEmployeeAccessToken,
  getB2bEmployeeCookieOptions,
} from "@/lib/b2b/employee-token";
import getSession from "@/lib/session";
import {
  B2bEmployeeSyncError,
  fetchAndStoreB2bHealthSnapshot,
  logB2bEmployeeAccess,
  upsertB2bEmployee,
} from "@/lib/b2b/employee-service";
import { regenerateB2bReport } from "@/lib/b2b/report-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { requireNhisSession } from "@/lib/server/route-auth";
import { resolveDbRouteError } from "@/lib/server/db-error";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  birthDate: z.string().trim().regex(/^\d{8}$/),
  phone: z.string().trim().regex(/^\d{10,11}$/),
  forceRefresh: z.boolean().optional(),
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  generateAiEvaluation: z.boolean().optional(),
});

const MIN_FORCE_REFRESH_COOLDOWN_SECONDS = 10 * 60;
const MAX_FORCE_REFRESH_COOLDOWN_SECONDS = 30 * 60;
const DEFAULT_FORCE_REFRESH_COOLDOWN_SECONDS = 15 * 60;

function resolveForceRefreshCooldownSeconds() {
  const parsed = Number(process.env.B2B_EMPLOYEE_FORCE_REFRESH_COOLDOWN_SECONDS);
  if (!Number.isFinite(parsed)) return DEFAULT_FORCE_REFRESH_COOLDOWN_SECONDS;
  const rounded = Math.round(parsed);
  return Math.min(
    MAX_FORCE_REFRESH_COOLDOWN_SECONDS,
    Math.max(MIN_FORCE_REFRESH_COOLDOWN_SECONDS, rounded)
  );
}

function computeForceRefreshCooldown(lastSyncedAt: Date | null, cooldownSeconds: number) {
  if (!lastSyncedAt) {
    return {
      available: true,
      remainingSeconds: 0,
      availableAt: null as string | null,
    };
  }
  const availableAtMs = lastSyncedAt.getTime() + cooldownSeconds * 1000;
  const remainingMs = availableAtMs - Date.now();
  if (remainingMs <= 0) {
    return {
      available: true,
      remainingSeconds: 0,
      availableAt: null as string | null,
    };
  }
  return {
    available: false,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    availableAt: new Date(availableAtMs).toISOString(),
  };
}

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
  try {
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
    const forceRefreshRequested = parsed.data.forceRefresh === true;
    const session = await getSession();
    const debugForceRefresh = req.headers.get("x-wb-force-refresh-debug") === "1";
    const canForceRefresh = session.admin?.loggedIn === true || debugForceRefresh;
    const forceRefreshCooldownSeconds = resolveForceRefreshCooldownSeconds();

    if (forceRefreshRequested && !canForceRefresh) {
      return noStoreJson(
        {
          ok: false,
          code: "FORCE_REFRESH_RESTRICTED",
          reason: "force_refresh_restricted",
          nextAction: "retry",
          error: "강제 재조회는 운영자 도구에서만 사용할 수 있습니다.",
        },
        403
      );
    }

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

    if (forceRefreshRequested) {
      const cooldown = computeForceRefreshCooldown(
        upserted.employee.lastSyncedAt,
        forceRefreshCooldownSeconds
      );
      if (!cooldown.available) {
        await logB2bEmployeeAccess({
          employeeId: upserted.employee.id,
          appUserId: auth.data.appUserId,
          action: "sync_force_refresh_cooldown",
          route: "/api/b2b/employee/sync",
          ip,
          userAgent,
          payload: {
            retryAfterSec: cooldown.remainingSeconds,
            availableAt: cooldown.availableAt,
            cooldownSeconds: forceRefreshCooldownSeconds,
          },
        });
        return noStoreJson(
          {
            ok: false,
            code: "SYNC_COOLDOWN",
            reason: "force_refresh_cooldown",
            nextAction: "wait",
            error: "재연동은 잠시 후 다시 시도해 주세요.",
            retryAfterSec: cooldown.remainingSeconds,
            availableAt: cooldown.availableAt,
            cooldown: {
              cooldownSeconds: forceRefreshCooldownSeconds,
              remainingSeconds: cooldown.remainingSeconds,
              availableAt: cooldown.availableAt,
            },
          },
          429
        );
      }
    }

    try {
      const syncResult = await fetchAndStoreB2bHealthSnapshot({
        appUserId: auth.data.appUserId,
        employeeId: upserted.employee.id,
        identity: upserted.identity,
        forceRefresh: forceRefreshRequested,
      });

      const periodKey = parsed.data.periodKey ?? resolveCurrentPeriodKey();
      const report = await regenerateB2bReport({
        employeeId: upserted.employee.id,
        pageSize: "A4",
        periodKey,
        recomputeAnalysis: true,
        generateAiEvaluation: parsed.data.generateAiEvaluation,
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
          forceRefresh: forceRefreshRequested,
          cooldown: {
            cooldownSeconds: forceRefreshCooldownSeconds,
            remainingSeconds: forceRefreshRequested
              ? forceRefreshCooldownSeconds
              : 0,
            availableAt: forceRefreshRequested
              ? new Date(
                  Date.now() + forceRefreshCooldownSeconds * 1000
                ).toISOString()
              : null,
          },
        },
        report: {
          id: report.id,
          variantIndex: report.variantIndex,
          status: report.status,
          periodKey: report.periodKey ?? periodKey,
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
          periodKey,
          forceRefresh: forceRefreshRequested,
        },
      });

      return response;
    } catch (error) {
      if (error instanceof B2bEmployeeSyncError) {
        await logB2bEmployeeAccess({
          employeeId: upserted.employee.id,
          appUserId: auth.data.appUserId,
          action: "sync_blocked",
          route: "/api/b2b/employee/sync",
          ip,
          userAgent,
          payload: {
            code: error.code,
            reason: error.reason,
            nextAction: error.nextAction,
          },
        });

        return noStoreJson(
          {
            ok: false,
            code: error.code,
            reason: error.reason,
            nextAction: error.nextAction,
            error: error.message,
          },
          error.status
        );
      }

      const dbError = resolveDbRouteError(error, "건강 데이터 동기화에 실패했습니다.");
      const message = dbError.message;

      await logB2bEmployeeAccess({
        employeeId: upserted.employee.id,
        appUserId: auth.data.appUserId,
        action: "sync_failed",
        route: "/api/b2b/employee/sync",
        ip,
        userAgent,
        payload: { error: message },
      });

      return noStoreJson(
        { ok: false, code: dbError.code, error: message },
        dbError.status
      );
    }
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "건강 데이터 동기화 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
