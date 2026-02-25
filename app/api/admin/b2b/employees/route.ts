import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdminSession } from "@/lib/server/route-auth";
import { resolveDbRouteError } from "@/lib/server/db-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const employees = await db.b2bEmployee.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phoneNormalized: { contains: q } },
              { birthDate: { contains: q } },
            ],
          }
        : undefined,
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      select: {
        id: true,
        name: true,
        birthDate: true,
        phoneNormalized: true,
        lastSyncedAt: true,
        lastViewedAt: true,
        updatedAt: true,
        _count: {
          select: {
            healthSnapshots: true,
            reports: true,
            surveyResponses: true,
            analysisResults: true,
          },
        },
      },
    });

    return noStoreJson({
      ok: true,
      employees: employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        birthDate: employee.birthDate,
        phoneNormalized: employee.phoneNormalized,
        lastSyncedAt: employee.lastSyncedAt?.toISOString() ?? null,
        lastViewedAt: employee.lastViewedAt?.toISOString() ?? null,
        updatedAt: employee.updatedAt.toISOString(),
        counts: employee._count,
      })),
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "임직원 목록 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
