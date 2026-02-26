import ReportRenderer from "@/components/b2b/ReportRenderer";
import styles from "@/components/b2b/B2bUx.module.css";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type { ReportAudit } from "../_lib/client-types";
import { formatIssueDebug } from "../_lib/client-utils";

type B2bLayoutValidationPanelProps = {
  busy: boolean;
  latestReportId: string | null;
  showExportPreview: boolean;
  latestLayout: LayoutDocument | null;
  validationAudit: ReportAudit | null;
  validationIssues: LayoutValidationIssue[];
  onRunValidation: () => void;
  onTogglePreview: () => void;
};

export default function B2bLayoutValidationPanel({
  busy,
  latestReportId,
  showExportPreview,
  latestLayout,
  validationAudit,
  validationIssues,
  onRunValidation,
  onTogglePreview,
}: B2bLayoutValidationPanelProps) {
  return (
    <details className={`${styles.optionalCard} ${styles.editorPanel}`}>
      <summary className={styles.editorPanelSummary}>
        <span className={styles.editorPanelSummaryTitle}>레이아웃 검증 및 디버그</span>
        <span className={styles.editorPanelSummaryMeta}>PDF/PPTX 내보내기 전 최종 확인</span>
      </summary>
      <div className={styles.editorPanelBody}>
        <div className={styles.editorGuide}>
          <p className={styles.editorGuideTitle}>입력 가이드</p>
          <ul className={styles.editorGuideList}>
            <li>레이아웃 검증 실행을 누르면 페이지 넘침/겹침/경계 이슈를 자동 점검합니다.</li>
            <li>A4 프리뷰를 열면 실제 출력 기준과 동일한 배치로 확인할 수 있어요.</li>
            <li>검증 이슈가 있으면 먼저 수정한 뒤 PDF/PPTX를 내보내 주세요.</li>
          </ul>
        </div>

        <div className={styles.actionRow}>
          <button
            type="button"
            onClick={onRunValidation}
            disabled={busy || !latestReportId}
            className={`${styles.buttonSecondary} ${styles.editorSecondaryButton}`}
          >
            {busy ? "레이아웃 검증 중..." : "레이아웃 검증 실행"}
          </button>
          <button
            type="button"
            onClick={onTogglePreview}
            disabled={busy}
            className={styles.buttonGhost}
          >
            {showExportPreview ? "A4 프리뷰 닫기" : "A4 프리뷰 보기"}
          </button>
        </div>

        {(validationAudit?.validation?.length ?? 0) > 0 ? (
          <section className={styles.editorSection}>
            <div className={styles.editorSectionHead}>
              <h3 className={styles.editorSectionTitle}>검증 결과 요약</h3>
              <p className={styles.editorSectionHint}>
                총 {validationAudit?.validation?.length ?? 0}개 스테이지
              </p>
            </div>
            <div className={styles.editorStatusGrid}>
              {(validationAudit?.validation ?? []).map((entry, index) => (
                <article
                  key={`${entry.stage}-${entry.stylePreset ?? "preset"}-${index}`}
                  className={styles.editorStatusCard}
                >
                  <p className={styles.editorStatusTitle}>
                    [{entry.stage}] {entry.ok ? "통과" : "실패"}
                  </p>
                  <p className={styles.editorStatusMeta}>
                    static {entry.staticIssueCount ?? 0} · runtime {entry.runtimeIssueCount ?? 0}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <p className={styles.inlineHint}>아직 검증 기록이 없습니다. 먼저 검증을 실행해 주세요.</p>
        )}

        {validationIssues.length > 0 ? (
          <section className={styles.editorSection}>
            <div className={styles.editorSectionHead}>
              <h3 className={styles.editorSectionTitle}>검증 이슈 상세</h3>
              <p className={styles.editorSectionHint}>총 {validationIssues.length}건</p>
            </div>
            <ul className={styles.listPlain}>
              {validationIssues.map((issue, index) => (
                <li key={`${issue.pageId}-${index}`}>
                  <strong>[{issue.code}]</strong> {issue.detail}
                  <div className={styles.inlineHint}>{formatIssueDebug(issue)}</div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className={styles.inlineHint}>현재 검증 이슈가 없습니다.</p>
        )}

        {showExportPreview ? (
          latestLayout ? (
            <ReportRenderer
              layout={latestLayout}
              fitToWidth
              debugOverlay
              issues={validationIssues}
            />
          ) : (
            <p className={styles.inlineHint}>표시할 레이아웃 데이터가 없습니다.</p>
          )
        ) : null}
      </div>
    </details>
  );
}
