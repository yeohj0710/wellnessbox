import type { MutableRefObject } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import type { LatestReport } from "../_lib/client-types";
import B2bIntegratedResultPreview from "./B2bIntegratedResultPreview";

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
          <h3>설문 결과 + 검사/이력 데이터 통합 보기</h3>
          <p>직원 리포트처럼 이 영역 안에서 스크롤하며 설문 결과와 건강 데이터를 함께 확인합니다.</p>
        </div>
        <span className={styles.statusWarn}>관리자 통합 뷰</span>
      </div>

      <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
        <div className={styles.adminIntegratedPreviewViewport}>
          <div
            ref={captureRef}
            className={styles.reportCaptureSurface}
            data-testid="report-capture-surface"
            data-report-pdf-parity="0"
          >
            <B2bIntegratedResultPreview payload={latestPayload} />
          </div>
        </div>
      </div>
    </section>
  );
}
