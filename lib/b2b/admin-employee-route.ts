import db from "@/lib/db";
import { noStoreJson } from "@/lib/server/no-store";
import { requireAdminSession } from "@/lib/server/route-auth";

export type B2bEmployeeRouteContext = {
  params: Promise<{ employeeId: string }>;
};

export type AdminEmployeeIdResult =
  | { ok: true; employeeId: string }
  | { ok: false; response: Response };

const EMPLOYEE_ID_REQUIRED_ERROR =
  "\uC9C1\uC6D0 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.";
const B2B_EMPLOYEE_NOT_FOUND_ERROR =
  "\uC9C1\uC6D0 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";

export async function requireAdminEmployeeId(
  ctx: B2bEmployeeRouteContext
): Promise<AdminEmployeeIdResult> {
  const auth = await requireAdminSession();
  if (!auth.ok) return { ok: false, response: auth.response };

  const { employeeId } = await ctx.params;
  const normalizedEmployeeId = employeeId?.trim();
  if (!normalizedEmployeeId) {
    return {
      ok: false,
      response: noStoreJson({ ok: false, error: EMPLOYEE_ID_REQUIRED_ERROR }, 400),
    };
  }
  return { ok: true, employeeId: normalizedEmployeeId };
}

export async function hasB2bEmployee(employeeId: string) {
  const employee = await db.b2bEmployee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  return Boolean(employee);
}

export async function requireAdminExistingEmployeeId(
  ctx: B2bEmployeeRouteContext
): Promise<AdminEmployeeIdResult> {
  const auth = await requireAdminEmployeeId(ctx);
  if (!auth.ok) return auth;

  const exists = await hasB2bEmployee(auth.employeeId);
  if (!exists) {
    return {
      ok: false,
      response: noStoreJson(
        { ok: false, error: B2B_EMPLOYEE_NOT_FOUND_ERROR },
        404
      ),
    };
  }

  return auth;
}
