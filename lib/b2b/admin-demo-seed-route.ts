import "server-only";

import { seedB2bDemoData } from "@/lib/b2b/demo-seed";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { noStoreJson } from "@/lib/server/no-store";
import { resolveDbRouteError } from "@/lib/server/db-error";

const DEMO_SEED_FAILED_ERROR =
  "\uB370\uBAA8 \uB370\uC774\uD130 \uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";

export async function runAdminDemoSeedPostRoute() {
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
    const dbError = resolveDbRouteError(error, DEMO_SEED_FAILED_ERROR);
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
