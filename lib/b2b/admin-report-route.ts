import { noStoreJson } from "@/lib/server/no-store";
import { requireAdminSession } from "@/lib/server/route-auth";

export type B2bReportRouteContext = {
  params: Promise<{ reportId: string }>;
};

export type AdminReportIdResult =
  | { ok: true; reportId: string }
  | { ok: false; response: Response };

export type AdminReportResult<TReport> =
  | { ok: true; reportId: string; report: TReport }
  | { ok: false; response: Response };

const DEFAULT_REPORT_NOT_FOUND_ERROR =
  "\uB9AC\uD3EC\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
const REPORT_ID_REQUIRED_ERROR =
  "\uB9AC\uD3EC\uD2B8 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.";

export async function requireAdminReportId(
  ctx: B2bReportRouteContext
): Promise<AdminReportIdResult> {
  const auth = await requireAdminSession();
  if (!auth.ok) return { ok: false, response: auth.response };

  const { reportId } = await ctx.params;
  const normalizedReportId = reportId?.trim();
  if (!normalizedReportId) {
    return {
      ok: false,
      response: noStoreJson({ ok: false, error: REPORT_ID_REQUIRED_ERROR }, 400),
    };
  }

  return { ok: true, reportId: normalizedReportId };
}

export async function requireAdminReport<TReport>(
  ctx: B2bReportRouteContext,
  getReport: (reportId: string) => Promise<TReport | null>,
  options?: {
    notFoundError?: string;
  }
): Promise<AdminReportResult<TReport>> {
  const reportIdResult = await requireAdminReportId(ctx);
  if (!reportIdResult.ok) return reportIdResult;

  const report = await getReport(reportIdResult.reportId);
  if (!report) {
    return {
      ok: false,
      response: noStoreJson(
        {
          ok: false,
          error: options?.notFoundError ?? DEFAULT_REPORT_NOT_FOUND_ERROR,
        },
        404
      ),
    };
  }

  return { ok: true, reportId: reportIdResult.reportId, report };
}
