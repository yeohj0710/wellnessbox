import type { MutableRefObject } from "react";
import ReportRenderer from "@/components/b2b/ReportRenderer";
import ReportSummaryCards from "@/components/b2b/ReportSummaryCards";
import styles from "@/components/b2b/B2bUx.module.css";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LatestReport } from "../_lib/client-types";
import B2bIntegratedResultPreview from "./B2bIntegratedResultPreview";

type B2bAdminReportPreviewTab = "integrated" | "report";

type B2bAdminReportPreviewPanelProps = {
  previewTab: B2bAdminReportPreviewTab;
  latestLayout: LayoutDocument | null;
  latestPayload: LatestReport["payload"] | undefined;
  captureRef: MutableRefObject<HTMLDivElement | null>;
  onPreviewTabChange: (nextTab: B2bAdminReportPreviewTab) => void;
};

export default function B2bAdminReportPreviewPanel(
  props: B2bAdminReportPreviewPanelProps
) {
  const { previewTab, latestLayout, latestPayload, captureRef, onPreviewTabChange } = props;

  return (
    <>
      <section className={styles.reportCanvas}>
        <div className={styles.reportCanvasHeader}>
          <div>
            <div className={styles.previewTabRow}>
              <button
                type="button"
                className={`${styles.previewTabButton} ${
                  previewTab === "integrated" ? styles.previewTabButtonActive : ""
                }`}
                onClick={() => onPreviewTabChange("integrated")}
              >
                통합 결과 보기
              </button>
              <button
                type="button"
                className={`${styles.previewTabButton} ${
                  previewTab === "report" ? styles.previewTabButtonActive : ""
                }`}
                onClick={() => onPreviewTabChange("report")}
              >
                레포트 본문 미리보기
              </button>
            </div>
            <h3>
              {previewTab === "integrated"
                ? "설문 결과 + 검사/이력 데이터 통합 보기"
                : "레포트 본문 미리보기"}
            </h3>
            <p>
              {previewTab === "integrated"
                ? "설문 결과 UI를 기본으로 보여주고, 건강검진 데이터와 진료/복약 이력을 함께 확인합니다."
                : "화면에서 보는 웹 레포트를 그대로 캡쳐해 PDF로 저장합니다."}
            </p>
          </div>
          <span className={previewTab === "integrated" ? styles.statusWarn : styles.statusOn}>
            {previewTab === "integrated" ? "관리자 통합 뷰" : "웹/PDF 동일 레이아웃 지향"}
          </span>
        </div>
        <div className={`${styles.reportCanvasBoard} ${styles.reportCanvasBoardWide}`}>
          <div
            ref={captureRef}
            className={styles.reportCaptureSurface}
            data-testid="report-capture-surface"
            data-report-pdf-parity={previewTab === "report" ? "1" : "0"}
          >
            {previewTab === "integrated" ? (
              <B2bIntegratedResultPreview payload={latestPayload} />
            ) : (
              <ReportSummaryCards payload={latestPayload} viewerMode="admin" />
            )}
          </div>
        </div>
      </section>

      {previewTab === "report" && latestLayout ? (
        <details className={`${styles.optionalCard} ${styles.reportLegacyPanel}`}>
          <summary>구버전 미리보기</summary>
          <div className={styles.optionalBody}>
            <p className={styles.optionalText}>
              기존 DSL 렌더 결과입니다. 비교 확인이 필요할 때만 펼쳐서 확인해 주세요.
            </p>
            <div className={styles.reportCanvasBoard}>
              <ReportRenderer layout={latestLayout} fitToWidth />
            </div>
          </div>
        </details>
      ) : null}
    </>
  );
}
