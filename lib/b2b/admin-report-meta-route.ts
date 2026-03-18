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
import { updateReportMeta } from "@/lib/b2b/report-meta-route-service";
import { noStoreJson } from "@/lib/server/no-store";

const packagedProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  brand: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  ingredientSummary: z.string().nullable().optional(),
  caution: z.string().nullable().optional(),
});

const patchSchema = z
  .object({
    displayPeriodKey: z
      .string()
      .regex(
        B2B_PERIOD_KEY_REGEX,
        "\uD45C\uC2DC \uC5F0\uC6D4\uC740 YYYY-MM \uD615\uC2DD\uC73C\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694."
      )
      .optional(),
    consultationSummary: z.string().max(1200).optional(),
    packagedProducts: z.array(packagedProductSchema).max(12).optional(),
  })
  .refine(
    (value) =>
      typeof value.displayPeriodKey === "string" ||
      typeof value.consultationSummary === "string" ||
      Array.isArray(value.packagedProducts),
    {
      message: "\uC218\uC815\uD560 \uB9AC\uD3EC\uD2B8 \uD56D\uBAA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
    }
  );

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

  const result = await updateReportMeta({
    report: reportResult.report,
    displayPeriodKey: parsed.data.displayPeriodKey,
    consultationSummary: parsed.data.consultationSummary,
    packagedProducts: parsed.data.packagedProducts,
  });

  if (!result.ok) {
    return noStoreJson(result.payload, result.status);
  }

  return noStoreJson({
    ok: true,
    report: result.report,
  });
}
