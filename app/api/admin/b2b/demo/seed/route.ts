import { NextResponse } from "next/server";
import { seedB2bDemoData } from "@/lib/b2b/demo-seed";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
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

export async function POST() {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const seeded = await seedB2bDemoData();

    await logB2bAdminAction({
      action: "demo_seed",
      actorTag: "admin",
      payload: {
        employeeCount: seeded.employeeIds.length,
        periods: seeded.periods,
      },
    });

    return noStoreJson({
      ok: true,
      employeeIds: seeded.employeeIds,
      periods: seeded.periods,
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "데모 데이터 생성에 실패했습니다."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
