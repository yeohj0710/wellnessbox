import { notFound } from "next/navigation";
import ReportPdfPage from "@/components/b2b/ReportPdfPage";
import { normalizePdfCaptureWidthPx } from "@/lib/b2b/export/pdf-capture-settings";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { ensureLatestB2bReport } from "@/lib/b2b/report-service";
import { requireAdminSession, requireB2bEmployeeToken } from "@/lib/server/route-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ period?: string; w?: string }>;
};

function resolveReportPayload(raw: unknown): ReportSummaryPayload | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ReportSummaryPayload;
}

function resolveReportWidth(rawWidth: string | undefined) {
  return normalizePdfCaptureWidthPx(rawWidth);
}

export default async function EmployeeReportPdfExportViewPage(props: PageProps) {
  const auth = await requireB2bEmployeeToken();
  if (!auth.ok) notFound();
  const adminAuth = await requireAdminSession();
  if (!adminAuth.ok) notFound();

  const searchParams = (await props.searchParams) ?? {};
  const requestedPeriod = (searchParams.period || "").trim();
  const periodKey = requestedPeriod || resolveCurrentPeriodKey();
  const reportWidthPx = resolveReportWidth(searchParams.w);

  const report = await ensureLatestB2bReport(auth.data.employeeId, periodKey);
  const payload = resolveReportPayload(report.reportPayload);

  return (
    <ReportPdfPage
      payload={payload}
      viewerMode="employee"
      reportWidthPx={reportWidthPx}
    />
  );
}
