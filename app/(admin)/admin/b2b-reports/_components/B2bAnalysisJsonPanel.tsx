import styles from "@/components/b2b/B2bUx.module.css";

type B2bAnalysisJsonPanelProps = {
  analysisText: string;
  busy: boolean;
  onAnalysisTextChange: (value: string) => void;
  onSave: () => void;
};

export default function B2bAnalysisJsonPanel({
  analysisText,
  busy,
  onAnalysisTextChange,
  onSave,
}: B2bAnalysisJsonPanelProps) {
  return (
    <details className={`${styles.optionalCard} ${styles.editorPanel}`}>
      <summary className={styles.editorPanelSummary}>
        <span className={styles.editorPanelSummaryTitle}>분석 JSON 편집</span>
        <span className={styles.editorPanelSummaryMeta}>고급 편집 · 구조 유지 필수</span>
      </summary>
      <div className={styles.editorPanelBody}>
        <div className={styles.editorGuide}>
          <p className={styles.editorGuideTitle}>입력 가이드</p>
          <ul className={styles.editorGuideList}>
            <li>이 영역은 고급 편집용입니다. 일반 운영은 설문/코멘트 입력을 우선 사용해 주세요.</li>
            <li>키 이름이나 배열 구조를 삭제하면 레포트 렌더링이 깨질 수 있어요.</li>
            <li>저장 전에는 JSON 문법 오류(쉼표, 따옴표, 중괄호)를 꼭 확인해 주세요.</li>
          </ul>
        </div>

        <section className={styles.editorFieldGroup}>
          <p className={styles.editorFieldLabel}>분석 데이터(JSON)</p>
          <p className={styles.editorFieldHint}>
            수정 후 저장하면 다음 리포트 생성/검증에 즉시 반영됩니다.
          </p>
          <div className={styles.editorCodeFrame}>
            <textarea
              className={`${styles.textarea} ${styles.mono}`}
              style={{ minHeight: 300 }}
              value={analysisText}
              onChange={(event) => onAnalysisTextChange(event.target.value)}
            />
          </div>
        </section>

        <div className={styles.editorActionBar}>
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className={`${styles.buttonPrimary} ${styles.editorPrimaryButton}`}
          >
            분석 JSON 저장
          </button>
        </div>
      </div>
    </details>
  );
}
