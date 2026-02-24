import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { createExportZip } from "@/lib/b2b/export/zip";
import { convertPptxBufferToPdf } from "@/lib/b2b/export/pdf";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { runB2bReportExport } from "@/lib/b2b/report-service";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

const schema = z.object({
  reportIds: z.array(z.string().trim().min(1)).max(100).optional(),
  employeeIds: z.array(z.string().trim().min(1)).max(100).optional(),
  format: z.enum(["pptx", "pdf", "both"]).default("pptx"),
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function resolveTargetReports(input: { reportIds?: string[]; employeeIds?: string[] }) {
  if (input.reportIds && input.reportIds.length > 0) {
    return db.b2bReport.findMany({
      where: { id: { in: input.reportIds } },
      orderBy: [{ employeeId: "asc" }, { variantIndex: "desc" }],
      take: 100,
    });
  }

  if (input.employeeIds && input.employeeIds.length > 0) {
    const reports = await Promise.all(
      input.employeeIds.map((employeeId) =>
        db.b2bReport.findFirst({
          where: { employeeId },
          orderBy: [{ variantIndex: "desc" }, { createdAt: "desc" }],
        })
      )
    );
    return reports.filter((report): report is NonNullable<typeof report> => Boolean(report));
  }

  return db.b2bReport.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 20,
  });
}

export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  if (process.env.B2B_ENABLE_BATCH_EXPORT !== "1") {
    return noStoreJson(
      {
        ok: false,
        error: "현재 운영 정책에서 배치 ZIP Export는 비활성화되어 있습니다.",
      },
      410
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson(
      { ok: false, error: parsed.error.issues[0]?.message || "입력 형식을 확인해 주세요." },
      400
    );
  }

  const targetReports = await resolveTargetReports({
    reportIds: parsed.data.reportIds,
    employeeIds: parsed.data.employeeIds,
  });
  if (targetReports.length === 0) {
    return noStoreJson({ ok: false, error: "내보낼 리포트가 없습니다." }, 404);
  }

  const files: Array<{ filename: string; content: Buffer }> = [];
  const summary: Array<{
    reportId: string;
    ok: boolean;
    reason?: string;
    files: string[];
  }> = [];

  for (const report of targetReports) {
    const exportResult = await runB2bReportExport(report.id);
    if (!exportResult.ok) {
      summary.push({
        reportId: report.id,
        ok: false,
        reason: "validation_failed",
        files: [],
      });
      continue;
    }

    const addedFiles: string[] = [];
    if (parsed.data.format === "pptx" || parsed.data.format === "both") {
      files.push({
        filename: exportResult.filename,
        content: exportResult.pptxBuffer,
      });
      addedFiles.push(exportResult.filename);
    }

    if (parsed.data.format === "pdf" || parsed.data.format === "both") {
      const pdfResult = await convertPptxBufferToPdf({
        pptxBuffer: exportResult.pptxBuffer,
        filename: exportResult.filename,
      });
      if (pdfResult.ok) {
        const pdfFilename = exportResult.filename.replace(/\.pptx$/i, ".pdf");
        files.push({
          filename: pdfFilename,
          content: pdfResult.pdfBuffer,
        });
        addedFiles.push(pdfFilename);
      } else {
        const errorFilename = `${exportResult.filename.replace(
          /\.pptx$/i,
          ""
        )}_pdf_error.txt`;
        files.push({
          filename: errorFilename,
          content: Buffer.from(
            `PDF conversion failed for report ${report.id}\nreason: ${pdfResult.reason || "unknown"}\n`,
            "utf8"
          ),
        });
        addedFiles.push(errorFilename);
      }
    }

    summary.push({
      reportId: report.id,
      ok: true,
      files: addedFiles,
    });
  }

  files.push({
    filename: "batch-summary.json",
    content: Buffer.from(
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalReports: targetReports.length,
          summary,
        },
        null,
        2
      )}\n`,
      "utf8"
    ),
  });

  const zipBuffer = await createExportZip({ files });
  const zipName = `b2b_reports_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.zip`;

  await logB2bAdminAction({
    action: "report_export_batch",
    actorTag: "admin",
    payload: {
      reportCount: targetReports.length,
      fileCount: files.length,
      format: parsed.data.format,
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
