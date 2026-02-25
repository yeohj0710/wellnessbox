import styles from "@/components/b2b/B2bUx.module.css";

type B2bNoteEditorPanelProps = {
  note: string;
  recommendations: string;
  cautions: string;
  busy: boolean;
  onNoteChange: (value: string) => void;
  onRecommendationsChange: (value: string) => void;
  onCautionsChange: (value: string) => void;
  onSave: () => void;
};

export default function B2bNoteEditorPanel({
  note,
  recommendations,
  cautions,
  busy,
  onNoteChange,
  onRecommendationsChange,
  onCautionsChange,
  onSave,
}: B2bNoteEditorPanelProps) {
  return (
    <details className={styles.optionalCard}>
      <summary>약사 코멘트 편집</summary>
      <div className={styles.optionalBody}>
        <textarea
          className={styles.textarea}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="요약 메모"
        />
        <textarea
          className={styles.textarea}
          value={recommendations}
          onChange={(event) => onRecommendationsChange(event.target.value)}
          placeholder="권장 사항"
        />
        <textarea
          className={styles.textarea}
          value={cautions}
          onChange={(event) => onCautionsChange(event.target.value)}
          placeholder="주의 사항"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className={styles.buttonPrimary}
        >
          코멘트 저장
        </button>
      </div>
    </details>
  );
}

