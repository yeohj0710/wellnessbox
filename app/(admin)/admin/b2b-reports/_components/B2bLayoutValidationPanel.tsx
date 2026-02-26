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
    <details className={styles.optionalCard}>
      <summary>레이아웃 검증 및 디버그</summary>
      <div className={styles.optionalBody}>
        <div className={styles.actionRow}>
          <button
            type="button"
            onClick={onRunValidation}
            disabled={busy || !latestReportId}
            className={styles.buttonSecondary}
          >
            레이아웃 검증 실행
          </button>
          <button type="button" onClick={onTogglePreview} className={styles.buttonGhost}>
            {showExportPreview ? "A4 프리뷰 숨기기" : "A4 프리뷰 보기"}
          </button>
        </div>
        {(validationAudit?.validation?.length ?? 0) > 0 ? (
          <ul className={styles.listPlain}>
            {(validationAudit?.validation ?? []).map((entry, index) => (
              <li key={`${entry.stage}-${entry.stylePreset ?? "preset"}-${index}`}>
                [{entry.stage}] {entry.ok ? "통과" : "실패"} / static{" "}
                {entry.staticIssueCount ?? 0} / runtime {entry.runtimeIssueCount ?? 0}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.inlineHint}>검증 기록이 없습니다.</p>
        )}
        {validationIssues.length > 0 ? (
          <ul className={styles.listPlain}>
            {validationIssues.map((issue, index) => (
              <li key={`${issue.pageId}-${index}`}>
                <strong>[{issue.code}]</strong> {issue.detail}
                <div className={styles.inlineHint}>{formatIssueDebug(issue)}</div>
              </li>
            ))}
          </ul>
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
            <p className={styles.inlineHint}>표시할 레이아웃이 없습니다.</p>
          )
        ) : null}
      </div>
    </details>
  );
}
