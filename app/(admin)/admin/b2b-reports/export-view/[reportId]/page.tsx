import { notFound } from "next/navigation";
import ReportPdfPage from "@/components/b2b/ReportPdfPage";
import { normalizePdfCaptureWidthPx } from "@/lib/b2b/export/pdf-capture-settings";
import db from "@/lib/db";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { requireAdminSession } from "@/lib/server/route-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ reportId: string }>;
  searchParams?: Promise<{ w?: string }>;
};

function resolveReportPayload(raw: unknown): ReportSummaryPayload | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ReportSummaryPayload;
}

function resolveReportWidth(rawWidth: string | undefined) {
  return normalizePdfCaptureWidthPx(rawWidth);
}

export default async function AdminB2bReportPdfExportViewPage(props: PageProps) {
  const auth = await requireAdminSession();
  if (!auth.ok) notFound();

  const { reportId } = await props.params;
  const searchParams = (await props.searchParams) ?? {};
  const reportWidthPx = resolveReportWidth(searchParams.w);
  const normalizedReportId = reportId?.trim();
  if (!normalizedReportId) notFound();

  const report = await db.b2bReport.findUnique({
    where: { id: normalizedReportId },
    select: {
      id: true,
      reportPayload: true,
    },
  });
  if (!report) notFound();

  const payload = resolveReportPayload(report.reportPayload);
  return (
    <ReportPdfPage payload={payload} viewerMode="admin" reportWidthPx={reportWidthPx} />
  );
}
