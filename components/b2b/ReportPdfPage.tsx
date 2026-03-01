import type { CSSProperties } from "react";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import ReportSummaryCards from "./ReportSummaryCards";
import styles from "./ReportPdfPage.module.css";

const DEFAULT_REPORT_WIDTH_PX = 1080;
const MIN_REPORT_WIDTH_PX = 280;
const MAX_REPORT_WIDTH_PX = 1400;
const REPORT_HEIGHT_RATIO = 281 / 194;

function normalizeReportWidthPx(value: number | null | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_REPORT_WIDTH_PX;
  const rounded = Math.round(Number(value));
  if (rounded < MIN_REPORT_WIDTH_PX) return MIN_REPORT_WIDTH_PX;
  if (rounded > MAX_REPORT_WIDTH_PX) return MAX_REPORT_WIDTH_PX;
  return rounded;
}

export default function ReportPdfPage(props: {
  payload: ReportSummaryPayload | null;
  viewerMode: "employee" | "admin";
  reportWidthPx?: number | null;
}) {
  const widthPx = normalizeReportWidthPx(props.reportWidthPx);
  const heightPx = Math.round(widthPx * REPORT_HEIGHT_RATIO);
  const surfaceStyle = {
    "--report-pdf-width": `${widthPx}px`,
    "--report-pdf-height": `${heightPx}px`,
  } as CSSProperties;

  return (
    <main className={styles.page} data-report-export-root="1">
      <div
        className={styles.surface}
        style={surfaceStyle}
        data-testid="report-capture-surface"
        data-report-pdf-parity="1"
        data-report-width-px={widthPx}
        data-report-height-px={heightPx}
      >
        <ReportSummaryCards payload={props.payload} viewerMode={props.viewerMode} />
      </div>
    </main>
  );
}
