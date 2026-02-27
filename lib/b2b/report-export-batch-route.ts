import db from "@/lib/db";
import { convertPptxBufferToPdf } from "@/lib/b2b/export/pdf";
import { runB2bReportExport } from "@/lib/b2b/report-service";

const BATCH_REPORT_LIMIT = 100;
const DEFAULT_BATCH_REPORT_COUNT = 20;

export type BatchExportFormat = "pptx" | "pdf" | "both";

export type BatchTargetReport = {
  id: string;
  employeeId: string;
};

export type BatchExportSummaryItem = {
  reportId: string;
  ok: boolean;
  reason?: string;
  files: string[];
};

export type BatchExportFile = {
  filename: string;
  content: Buffer;
};

function uniqueTrimmed(values: string[] | undefined) {
  if (!values || values.length === 0) return [];
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed) unique.add(trimmed);
    if (unique.size >= BATCH_REPORT_LIMIT) break;
  }
  return [...unique];
}

export async function resolveBatchTargetReports(input: {
  reportIds?: string[];
  employeeIds?: string[];
}): Promise<BatchTargetReport[]> {
  const reportIds = uniqueTrimmed(input.reportIds);
  if (reportIds.length > 0) {
    const reports = await db.b2bReport.findMany({
      where: { id: { in: reportIds } },
      select: {
        id: true,
        employeeId: true,
      },
      take: BATCH_REPORT_LIMIT,
    });
    const byId = new Map(reports.map((report) => [report.id, report]));
    return reportIds
      .map((reportId) => byId.get(reportId))
      .filter((report): report is BatchTargetReport => Boolean(report));
  }

  const employeeIds = uniqueTrimmed(input.employeeIds);
  if (employeeIds.length > 0) {
    const reports = await Promise.all(
      employeeIds.map((employeeId) =>
        db.b2bReport.findFirst({
          where: { employeeId },
          orderBy: [{ variantIndex: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            employeeId: true,
          },
        })
      )
    );
    return reports.filter((report): report is BatchTargetReport => Boolean(report));
  }

  return db.b2bReport.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: DEFAULT_BATCH_REPORT_COUNT,
    select: {
      id: true,
      employeeId: true,
    },
  });
}

function buildPdfErrorFile(input: {
  reportId: string;
  pptxFilename: string;
  reason: string;
}): BatchExportFile {
  const errorFilename = `${input.pptxFilename.replace(
    /\.pptx$/i,
    ""
  )}_pdf_error.txt`;
  return {
    filename: errorFilename,
    content: Buffer.from(
      `PDF conversion failed for report ${input.reportId}\nreason: ${input.reason}\n`,
      "utf8"
    ),
  };
}

function buildBatchSummaryFile(input: {
  totalReports: number;
  summary: BatchExportSummaryItem[];
}): BatchExportFile {
  return {
    filename: "batch-summary.json",
    content: Buffer.from(
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalReports: input.totalReports,
          summary: input.summary,
        },
        null,
        2
      )}\n`,
      "utf8"
    ),
  };
}

async function buildBatchExportEntry(input: {
  report: BatchTargetReport;
  format: BatchExportFormat;
}): Promise<{
  files: BatchExportFile[];
  summary: BatchExportSummaryItem;
}> {
  const exportResult = await runB2bReportExport(input.report.id);
  if (!exportResult.ok) {
    return {
      files: [],
      summary: {
        reportId: input.report.id,
        ok: false,
        reason: "layout_validation_failed",
        files: [],
      },
    };
  }

  const files: BatchExportFile[] = [];
  const addedFiles: string[] = [];
  let success = true;
  let reason: string | undefined;

  if (input.format === "pptx" || input.format === "both") {
    files.push({
      filename: exportResult.filename,
      content: exportResult.pptxBuffer,
    });
    addedFiles.push(exportResult.filename);
  }

  if (input.format === "pdf" || input.format === "both") {
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
      success = false;
      reason = "pdf_conversion_failed";
      const errorFile = buildPdfErrorFile({
        reportId: input.report.id,
        pptxFilename: exportResult.filename,
        reason: pdfResult.reason || "unknown",
      });
      files.push(errorFile);
      addedFiles.push(errorFile.filename);
    }
  }

  return {
    files,
    summary: {
      reportId: input.report.id,
      ok: success,
      reason,
      files: addedFiles,
    },
  };
}

export async function buildBatchExportArtifacts(input: {
  reports: BatchTargetReport[];
  format: BatchExportFormat;
}): Promise<{
  files: BatchExportFile[];
  summary: BatchExportSummaryItem[];
}> {
  const files: BatchExportFile[] = [];
  const summary: BatchExportSummaryItem[] = [];

  for (const report of input.reports) {
    const entry = await buildBatchExportEntry({
      report,
      format: input.format,
    });
    files.push(...entry.files);
    summary.push(entry.summary);
  }

  files.push(
    buildBatchSummaryFile({
      totalReports: input.reports.length,
      summary,
    })
  );

  return { files, summary };
}

export function resolveBatchZipFilename(now = new Date()) {
  return `b2b_reports_${now.toISOString().slice(0, 10).replace(/-/g, "")}.zip`;
}
