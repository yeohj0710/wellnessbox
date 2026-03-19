import type { MutableRefObject } from "react";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import styles from "@/components/b2b/B2bUx.module.css";
import type { EmployeeReportResponse } from "../_lib/client-types";

type EmployeeReportCapturePreviewProps = {
  reportData: EmployeeReportResponse;
  captureRef: MutableRefObject<HTMLDivElement | null>;
};

export default function EmployeeReportCapturePreview(
  props: EmployeeReportCapturePreviewProps
) {
  return (
    <section className={styles.reportCanvas}>
      <div className={styles.reportCanvasHeader}>
        <div className={styles.reportCanvasMeta}>
          <p className={styles.reportCanvasEyebrow}>A4 Report Preview</p>
          <h3>직원 건강 리포트 미리보기</h3>
          <p>
            웹에서는 페이지 흐름을 문서처럼 이어서 보고, PDF는 같은 정보 구조를 A4 기준으로
            정리해 내보냅니다.
          </p>
        </div>

        <div className={styles.reportCanvasBadgeRow}>
          <span className={styles.statusOn}>웹/PDF 공통 본문</span>
          <span className={styles.reportCanvasBadge}>페이지 구분 강화</span>
        </div>
      </div>

      <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
        <div
          ref={props.captureRef}
          className={styles.reportCaptureSurface}
          data-testid="report-capture-surface"
          data-report-pdf-parity="1"
          data-report-screen-preview="1"
        >
          <ReportSummaryCards payload={props.reportData.report?.payload} />
        </div>
      </div>
    </section>
  );
}
