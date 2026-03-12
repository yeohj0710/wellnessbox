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
        <div>
          <h3>레포트 본문 미리보기</h3>
          <p>화면에서 보는 웹 레포트를 그대로 캡처해 PDF로 저장합니다.</p>
        </div>
        <span className={styles.statusOn}>웹/PDF 동일 레이아웃</span>
      </div>
      <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
        <div
          ref={props.captureRef}
          className={styles.reportCaptureSurface}
          data-testid="report-capture-surface"
          data-report-pdf-parity="1"
        >
          <ReportSummaryCards payload={props.reportData.report?.payload} />
        </div>
      </div>
    </section>
  );
}
