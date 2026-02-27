import { NextResponse } from "next/server";
import { z } from "zod";
import { createExportZip } from "@/lib/b2b/export/zip";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import {
  buildBatchExportArtifacts,
  resolveBatchTargetReports,
  resolveBatchZipFilename,
} from "@/lib/b2b/report-export-batch-route";
import { buildDbErrorResponse } from "@/lib/b2b/route-helpers";
import { noStoreJson } from "@/lib/server/no-store";

const batchExportRequestSchema = z.object({
  reportIds: z.array(z.string().trim().min(1)).max(100).optional(),
  employeeIds: z.array(z.string().trim().min(1)).max(100).optional(),
  format: z.enum(["pptx", "pdf", "both"]).default("pptx"),
});

const BATCH_EXPORT_DISABLED_ERROR =
  "\uD604\uC7AC \uC6B4\uC601 \uC815\uCC45\uC5D0\uC11C \uBC30\uCE58 ZIP Export\uB294 \uBE44\uD65C\uC131\uD654\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.";
const BATCH_EXPORT_INVALID_INPUT_ERROR =
  "\uC785\uB825 \uD615\uC2DD\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const BATCH_EXPORT_NO_REPORTS_ERROR =
  "\uB0B4\uBCF4\uB0BC \uB9AC\uD3EC\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.";
const BATCH_EXPORT_FAILED_ERROR =
  "\uBC30\uCE58 export \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

function parseBatchExportBody(rawBody: unknown) {
  const parsed = batchExportRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false as const,
      response: noStoreJson(
        {
          ok: false,
          error: parsed.error.issues[0]?.message || BATCH_EXPORT_INVALID_INPUT_ERROR,
        },
        400
      ),
    };
  }

  return { ok: true as const, data: parsed.data };
}

export function resolveBatchExportDisabledResponse() {
  if (process.env.B2B_ENABLE_BATCH_EXPORT === "1") return null;
  return noStoreJson({ ok: false, error: BATCH_EXPORT_DISABLED_ERROR }, 410);
}

export async function runAdminBatchReportExport(input: {
  rawBody: unknown;
  actorTag?: string;
}) {
  const parsed = parseBatchExportBody(input.rawBody);
  if (!parsed.ok) return parsed.response;

  const targetReports = await resolveBatchTargetReports({
    reportIds: parsed.data.reportIds,
    employeeIds: parsed.data.employeeIds,
  });
  if (targetReports.length === 0) {
    return noStoreJson({ ok: false, error: BATCH_EXPORT_NO_REPORTS_ERROR }, 404);
  }

  const { files, summary } = await buildBatchExportArtifacts({
    reports: targetReports,
    format: parsed.data.format,
  });

  const zipBuffer = await createExportZip({ files });
  const zipName = resolveBatchZipFilename();
  const failedCount = summary.filter((item) => !item.ok).length;

  await logB2bAdminAction({
    action: "report_export_batch",
    actorTag: input.actorTag ?? "admin",
    payload: {
      reportCount: targetReports.length,
      fileCount: files.length,
      format: parsed.data.format,
      failedCount,
    },
  });

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=\"${zipName}\"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function runAdminBatchReportExportPostRoute(req: Request) {
  const disabledResponse = resolveBatchExportDisabledResponse();
  if (disabledResponse) return disabledResponse;

  try {
    const body = await req.json().catch(() => null);
    return runAdminBatchReportExport({
      rawBody: body,
      actorTag: "admin",
    });
  } catch (error) {
    return buildDbErrorResponse(error, BATCH_EXPORT_FAILED_ERROR);
  }
}
