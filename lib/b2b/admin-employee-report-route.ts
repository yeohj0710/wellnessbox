import "server-only";

import {
  requireAdminExistingEmployeeId,
  type B2bEmployeeRouteContext,
} from "@/lib/b2b/admin-employee-route";
import { adminReportPostSchema } from "@/lib/b2b/report-route-schema";
import {
  loadAdminReportLookup,
  runAdminReportMutation,
} from "@/lib/b2b/report-route-service";
import {
  buildValidationErrorResponse,
  parseRouteBodyWithSchema,
} from "@/lib/b2b/route-helpers";
import { noStoreJson } from "@/lib/server/no-store";

export const ADMIN_REPORT_INVALID_INPUT_ERROR =
  "\uC785\uB825 \uD615\uC2DD\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";

export async function runAdminEmployeeReportGetRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const lookup = await loadAdminReportLookup(
    authEmployee.employeeId,
    new URL(req.url).searchParams.get("period")
  );

  return noStoreJson({
    ok: true,
    ...lookup,
  });
}

export async function runAdminEmployeeReportPostRoute(
  req: Request,
  ctx: B2bEmployeeRouteContext
) {
  const authEmployee = await requireAdminExistingEmployeeId(ctx);
  if (!authEmployee.ok) return authEmployee.response;

  const parsed = await parseRouteBodyWithSchema(req, adminReportPostSchema, {});
  if (!parsed.success) {
    return buildValidationErrorResponse(
      parsed.error,
      ADMIN_REPORT_INVALID_INPUT_ERROR
    );
  }

  const mutationResult = await runAdminReportMutation({
    employeeId: authEmployee.employeeId,
    payload: parsed.data,
  });

  return noStoreJson({
    ok: true,
    report: mutationResult.report,
  });
}
