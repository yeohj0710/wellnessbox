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
    <details className={styles.optionalCard}>
      <summary>분석 JSON 편집</summary>
      <div className={styles.optionalBody}>
        <textarea
          className={`${styles.textarea} ${styles.mono}`}
          style={{ minHeight: 280 }}
          value={analysisText}
          onChange={(event) => onAnalysisTextChange(event.target.value)}
        />
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className={styles.buttonPrimary}
        >
          분석 JSON 저장
        </button>
      </div>
    </details>
  );
}

