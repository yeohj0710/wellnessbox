import "server-only";

import { z } from "zod";
import db from "@/lib/db";
import type { B2bReportRouteContext } from "@/lib/b2b/admin-report-route";
import { requireAdminReport } from "@/lib/b2b/admin-report-route";
import { B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";
import {
  buildValidationErrorResponse,
  parseRouteBodyWithSchema,
} from "@/lib/b2b/route-helpers";
import { updateReportDisplayPeriod } from "@/lib/b2b/report-meta-route-service";
import { noStoreJson } from "@/lib/server/no-store";

const patchSchema = z.object({
  displayPeriodKey: z.string().regex(
    B2B_PERIOD_KEY_REGEX,
    "\uD45C\uC2DC \uC5F0\uC6D4\uC740 YYYY-MM \uD615\uC2DD\uC73C\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694."
  ),
});

const INVALID_INPUT_ERROR =
  "\uC785\uB825\uAC12\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";

export async function runAdminReportMetaPatchRoute(
  req: Request,
  ctx: B2bReportRouteContext
) {
  const reportResult = await requireAdminReport(ctx, (reportId) =>
    db.b2bReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        employeeId: true,
        variantIndex: true,
        pageSize: true,
        stylePreset: true,
        reportPayload: true,
        periodKey: true,
      },
    })
  );
  if (!reportResult.ok) return reportResult.response;

  const parsed = await parseRouteBodyWithSchema(req, patchSchema, {});
  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error, INVALID_INPUT_ERROR);
  }

  const result = await updateReportDisplayPeriod({
    report: reportResult.report,
    displayPeriodKey: parsed.data.displayPeriodKey,
  });

  if (!result.ok) {
    return noStoreJson(result.payload, result.status);
  }

  return noStoreJson({
    ok: true,
    report: result.report,
  });
}
