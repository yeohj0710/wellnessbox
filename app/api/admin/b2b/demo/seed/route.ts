import { NextResponse } from "next/server";
import { seedB2bDemoData } from "@/lib/b2b/demo-seed";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
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
    const message =
      error instanceof Error ? error.message : "데모 데이터 생성에 실패했습니다.";
    return noStoreJson({ ok: false, error: message }, 500);
  }
}
