import type { MutableRefObject } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import type { LatestReport } from "../_lib/client-types";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";

type B2bAdminReportPreviewPanelProps = {
  latestPayload: LatestReport["payload"] | undefined;
  captureRef: MutableRefObject<HTMLDivElement | null>;
};

export default function B2bAdminReportPreviewPanel(
  props: B2bAdminReportPreviewPanelProps
) {
  const { latestPayload, captureRef } = props;

  return (
    <section className={styles.reportCanvas}>
      <div className={styles.reportCanvasHeader}>
        <div>
          <h3>리포트 미리보기</h3>
          <p>직원에게 보이는 리포트와 같은 구성으로 약사 코멘트 마지막 페이지까지 확인합니다.</p>
        </div>
        <span className={styles.statusWarn}>관리자 미리보기</span>
      </div>

      <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
        <div className={styles.adminIntegratedPreviewViewport}>
          <div
            ref={captureRef}
            className={styles.reportCaptureSurface}
            data-testid="report-capture-surface"
            data-report-pdf-parity="0"
          >
            <ReportSummaryCards payload={latestPayload} />
          </div>
        </div>
      </div>
    </section>
  );
}
