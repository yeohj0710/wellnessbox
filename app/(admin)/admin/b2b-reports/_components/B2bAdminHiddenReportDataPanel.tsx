import styles from "@/components/b2b/B2bUx.module.css";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { buildB2bIntegratedResultPreviewModel } from "../_lib/b2b-integrated-result-preview-model";
import B2bIntegratedMedicationReviewSection from "./B2bIntegratedMedicationReviewSection";
import B2bIntegratedSupplementDesignSection from "./B2bIntegratedSupplementDesignSection";

type B2bAdminHiddenReportDataPanelProps = {
  payload: ReportSummaryPayload | null | undefined;
};

export default function B2bAdminHiddenReportDataPanel({
  payload,
}: B2bAdminHiddenReportDataPanelProps) {
  const previewModel = buildB2bIntegratedResultPreviewModel(payload);

  return (
    <details className={`${styles.optionalCard} ${styles.editorPanel}`}>
      <summary className={styles.editorPanelSummary}>
        <span className={styles.editorPanelSummaryTitle}>레포트 숨김 정보 확인</span>
        <span className={styles.editorPanelSummaryMeta}>맞춤 영양제 설계 · 복약 이력</span>
      </summary>
      <div className={styles.editorPanelMotion}>
        <div className={styles.editorPanelBody}>
          {payload ? (
            <>
              <B2bIntegratedSupplementDesignSection
                supplementDesigns={previewModel.supplementDesigns}
              />
              <B2bIntegratedMedicationReviewSection
                medicationStatusMessage={previewModel.medicationStatusMessage}
                medications={previewModel.medications}
              />
            </>
          ) : (
            <p className={styles.inlineHint}>확인할 추가 정보 데이터가 없습니다.</p>
          )}
        </div>
      </div>
    </details>
  );
}
